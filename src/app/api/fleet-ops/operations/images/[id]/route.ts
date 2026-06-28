import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import { shouldUseMongoDb } from '@/lib/storage-utils';
import { requireAuth, AuthResult } from '@/lib/auth-guards';
import { logger } from '@/lib/logger';

// Local storage paths
const dataDir = path.join(process.cwd(), 'data');
const imagesDir = path.join(dataDir, 'mission-images');

// Strict identifier formats: image IDs are either a crypto.randomUUID() (local
// storage) or a MongoDB ObjectId hex string. Anything else is rejected to
// prevent path traversal and unsafe lookups.
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

function isValidImageId(id: string): boolean {
  return UUID_REGEX.test(id) || OBJECT_ID_REGEX.test(id);
}

// Helper function to create a MongoDB filter that works with both ObjectId and string IDs
function createIdFilter(id: string): any {
  try {
    // Try to convert to ObjectId
    const objectId = new ObjectId(id);
    return { _id: objectId };
  } catch (error) {
    // If it's not a valid ObjectId, use alternatives
    return {
      $or: [{ _id: id }, { id: id }, { temporaryId: id }],
    };
  }
}

// Ensure a resolved path stays inside the trusted images directory. Never trust
// a stored storagePath (or a derived path) without this containment check.
function isPathContained(targetPath: string, baseDir: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(resolvedBase + path.sep);
}

// Normalize a stored missionId (may be an ObjectId, string, or undefined) to a string.
function normalizeMissionId(missionId: unknown): string | null {
  if (missionId === null || missionId === undefined) return null;
  if (typeof missionId === 'string') return missionId.length > 0 ? missionId : null;
  try {
    const asString = String(missionId);
    return asString.length > 0 ? asString : null;
  } catch {
    return null;
  }
}

// Per-mission access control mirroring the upload-image authorization logic:
// a user may read a mission image if they are the mission leader/creator, a
// participant, or hold leadership clearance (>= 3). Fails closed on any error
// or when the mission cannot be resolved.
async function userCanAccessMission(missionId: string | null, auth: AuthResult): Promise<boolean> {
  // Leadership clearance always grants access.
  if (auth.clearanceLevel >= 3) return true;

  if (!missionId) return false;

  // Temporary missions are not persisted; restrict to the authenticated user only.
  if (missionId.startsWith('temp-')) return true;

  try {
    const { db } = await connectToDatabase();

    let mongoMissionId: string | ObjectId = missionId;
    try {
      mongoMissionId = new ObjectId(missionId);
    } catch {
      // Use as string if not a valid ObjectId
    }

    const mission = await db
      .collection('missions')
      .findOne(
        { _id: mongoMissionId as any },
        { projection: { leader: 1, participants: 1, createdBy: 1 } }
      );

    if (!mission) {
      // Cannot resolve the mission -- deny rather than leak the bytes.
      return false;
    }

    const isLeader = mission.leader === auth.userId || mission.createdBy === auth.userId;
    const isParticipant =
      Array.isArray(mission.participants) &&
      mission.participants.some((p: { userId?: string }) => p.userId === auth.userId);

    return isLeader || isParticipant;
  } catch (authCheckError) {
    logger.error(
      'Error checking mission access for image retrieval',
      authCheckError instanceof Error ? authCheckError : new Error(String(authCheckError)),
      { route: '/api/fleet-ops/operations/images/[id]', missionId }
    );
    return false;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Check authentication
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const imageId = id;
    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Reject anything that is not a strict UUID or ObjectId before any lookup.
    if (!isValidImageId(imageId)) {
      logger.info('Rejected image request with invalid ID format', {
        route: '/api/fleet-ops/operations/images/[id]',
        imageId,
      });
      return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 });
    }

    logger.info('Retrieving image', { route: '/api/fleet-ops/operations/images/[id]', imageId });

    // Try to retrieve from MongoDB first
    if (await shouldUseMongoDb()) {
      try {
        const { db } = await connectToDatabase();

        // Create a filter that works with the ID format
        const filter = createIdFilter(imageId);
        const image = await db.collection('missionImages').findOne(filter);

        if (image && image.data) {
          // Per-mission access control before returning bytes.
          const missionId = normalizeMissionId(image.missionId);
          const allowed = await userCanAccessMission(missionId, auth);
          if (!allowed) {
            logger.info('RBAC_AUDIT: User denied image retrieval', {
              route: '/api/fleet-ops/operations/images/[id]',
              userId: auth.userId,
              imageId,
              missionId,
            });
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
          }

          logger.info('Found image in MongoDB', {
            route: '/api/fleet-ops/operations/images/[id]',
            imageId,
            filename: image.filename,
          });

          // Return the image with the correct content type
          const etag =
            'W/"' +
            (image._id?.toString() || image.filename) +
            '-' +
            (image.uploadedAt?.getTime?.() || 0) +
            '"';
          if (request.headers.get('if-none-match') === etag) {
            return new Response(null, { status: 304 });
          }
          return new Response(image.data.buffer, {
            headers: {
              'Content-Type': image.contentType,
              'Cache-Control': 'private, max-age=31536000, immutable',
              ETag: etag,
            },
          });
        }
      } catch (mongoError) {
        logger.error(
          'Error retrieving image from MongoDB',
          mongoError instanceof Error ? mongoError : new Error(String(mongoError)),
          { route: '/api/fleet-ops/operations/images/[id]', imageId }
        );
        // Fall back to local file system
      }
    }

    // Try to find image in local file system
    logger.info('Checking for image in local storage', {
      route: '/api/fleet-ops/operations/images/[id]',
      imageId,
    });

    // Check for metadata file
    const metadataPath = path.join(imagesDir, `${imageId}.json`);

    // Defense in depth: ensure the derived metadata path stays inside imagesDir.
    if (!isPathContained(metadataPath, imagesDir)) {
      logger.info('Rejected out-of-bounds metadata path', {
        route: '/api/fleet-ops/operations/images/[id]',
        imageId,
      });
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    if (fs.existsSync(metadataPath)) {
      try {
        // Read the metadata
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

        // Per-mission access control before returning bytes.
        const missionId = normalizeMissionId(metadata.missionId);
        const allowed = await userCanAccessMission(missionId, auth);
        if (!allowed) {
          logger.info('RBAC_AUDIT: User denied image retrieval', {
            route: '/api/fleet-ops/operations/images/[id]',
            userId: auth.userId,
            imageId,
            missionId,
          });
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Resolve the image file path. Never trust metadata.storagePath without
        // verifying it resolves inside the images directory.
        const imagePath =
          metadata.storagePath ||
          path.join(imagesDir, `${imageId}.${metadata.filename.split('.').pop()}`);

        if (!isPathContained(imagePath, imagesDir)) {
          logger.info('Rejected out-of-bounds image path', {
            route: '/api/fleet-ops/operations/images/[id]',
            imageId,
          });
          return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        if (fs.existsSync(imagePath)) {
          logger.info('Found image in local storage', {
            route: '/api/fleet-ops/operations/images/[id]',
            imageId,
            filename: metadata.filename,
          });
          const imageBuffer = fs.readFileSync(imagePath);

          // Return the image with the correct content type
          const stats = fs.statSync(imagePath);
          const etag = 'W/"' + imageId + '-' + stats.mtimeMs + '"';
          if (request.headers.get('if-none-match') === etag) {
            return new Response(null, { status: 304 });
          }
          return new Response(imageBuffer, {
            headers: {
              'Content-Type': metadata.contentType,
              'Cache-Control': 'private, max-age=31536000, immutable',
              ETag: etag,
            },
          });
        }
      } catch (fsError) {
        logger.error(
          'Error reading image from local storage',
          fsError instanceof Error ? fsError : new Error(String(fsError)),
          { route: '/api/fleet-ops/operations/images/[id]', imageId }
        );
      }
    }

    // If all methods fail, return 404
    logger.info('Image not found', { route: '/api/fleet-ops/operations/images/[id]', imageId });
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  } catch (error) {
    logger.error(
      'Error in get-image route',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/operations/images/[id]' }
    );
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
