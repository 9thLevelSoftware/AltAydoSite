import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { shouldUseMongoDb } from '@/lib/storage-utils';
import { requireAuth, type AuthResult } from '@/lib/auth-guards';
import * as missionStorage from '@/lib/mission-storage';
import { MissionResponse } from '@/types/Mission';
import { validateImageBuffer, MAX_IMAGE_SIZE } from '@/lib/file-validation';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '@/lib/logger';

// Setup local storage for fallback
const dataDir = path.join(process.cwd(), 'data');
const imagesDir = path.join(dataDir, 'mission-images');
const missionsFilePath = path.join(dataDir, 'missions.json');

/**
 * Reads missions from the local JSON fallback store.
 * Throws on read/parse errors so callers can avoid failing open.
 */
function readLocalMissions(): MissionResponse[] {
  if (!fs.existsSync(missionsFilePath)) {
    return [];
  }
  const data = fs.readFileSync(missionsFilePath, 'utf8');
  return JSON.parse(data) as MissionResponse[];
}

/**
 * Resolves a mission through the storage layer, honoring the Cosmos/local-JSON
 * fallback. Returns null when the mission genuinely does not exist; throws when
 * the storage backend cannot be reached (so callers must not fail open).
 */
async function resolveMissionForAuth(missionId: string): Promise<MissionResponse | null> {
  if (await shouldUseMongoDb()) {
    return missionStorage.getMissionById(missionId);
  }
  return readLocalMissions().find((m) => m.id === missionId) ?? null;
}

/**
 * Authorization predicate for mission image uploads: the uploader must be the
 * mission leader, a participant, or hold leadership clearance (level >= 3).
 */
function isAuthorizedToUploadToMission(mission: MissionResponse, auth: AuthResult): boolean {
  const isLeader = mission.leaderId === auth.userId;
  const isParticipant =
    Array.isArray(mission.participants) &&
    mission.participants.some((p: { userId?: string }) => p.userId === auth.userId);
  const hasLeadershipClearance = auth.clearanceLevel >= 3;
  return isLeader || isParticipant || hasLeadershipClearance;
}

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authentication (requireAuth replaces bare getServerSession)
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const missionId = formData.get('missionId') as string;

    // 2. Basic validation
    if (!image) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    if (!missionId) {
      return NextResponse.json({ error: 'Mission ID is required' }, { status: 400 });
    }

    // 3. Size check using shared constant
    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    // 4. Get file buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 5. Magic byte validation (SEC-13) -- replaces Content-Type header check
    const validation = await validateImageBuffer(buffer, image.type);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid image file' },
        { status: 400 }
      );
    }

    // 6. Authorization check (SEC-09) -- verify uploader is participant/leader
    const isTempId = missionId.startsWith('temp-');
    if (!isTempId) {
      // For existing missions, resolve via the storage layer (Cosmos + local
      // fallback) and verify the user is a participant, leader, or has
      // leadership clearance. Never fail open: an unverifiable mission must be
      // rejected rather than allowed.
      let mission: MissionResponse | null;
      try {
        mission = await resolveMissionForAuth(missionId);
      } catch (authCheckError) {
        logger.error(
          'Error resolving mission for upload authorization',
          authCheckError instanceof Error ? authCheckError : new Error(String(authCheckError)),
          { route: '/api/fleet-ops/operations/upload-image', missionId }
        );
        // Do NOT fail open on storage errors for non-temp IDs.
        return NextResponse.json(
          { error: 'Unable to verify operation ownership. Please try again.' },
          { status: 503 }
        );
      }

      if (!mission) {
        logger.info('RBAC_AUDIT: upload rejected, mission not found', {
          route: '/api/fleet-ops/operations/upload-image',
          userId: auth.userId,
          missionId,
          reason: 'mission not found',
        });
        return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
      }

      if (!isAuthorizedToUploadToMission(mission, auth)) {
        logger.info('RBAC_AUDIT: User denied upload to mission', {
          route: '/api/fleet-ops/operations/upload-image',
          userId: auth.userId,
          missionId,
          reason: 'not participant/leader',
        });
        return NextResponse.json(
          { error: 'You must be a participant or leader of this operation to upload images' },
          { status: 403 }
        );
      }
    }

    // Generate a unique ID for the image
    const imageId = crypto.randomUUID();

    // Try to use MongoDB first
    if (await shouldUseMongoDb()) {
      try {
        logger.info('Storing image in MongoDB', {
          route: '/api/fleet-ops/operations/upload-image',
          missionId,
        });
        const { db } = await connectToDatabase();

        // Convert to ObjectId if not a temp ID and if possible
        let mongoMissionId: string | ObjectId = missionId;
        if (!isTempId) {
          try {
            mongoMissionId = new ObjectId(missionId);
          } catch {
            logger.info('Could not convert mission ID to ObjectId, using as string', {
              route: '/api/fleet-ops/operations/upload-image',
              missionId,
            });
          }
        }

        // Store image in MongoDB
        const imageDoc = {
          filename: image.name,
          contentType: validation.detectedType || image.type,
          size: image.size,
          uploadedBy: auth.userId,
          uploadedAt: new Date(),
          data: buffer,
          missionId: mongoMissionId,
        };

        const result = await db.collection('missionImages').insertOne(imageDoc);

        if (result.insertedId) {
          // For non-temp missions with a valid ObjectId, the image insert and the
          // mission reference update must succeed or fail together. If the
          // reference update fails, roll back the just-inserted image so we don't
          // leave an orphaned document and falsely report success.
          if (!isTempId && mongoMissionId instanceof ObjectId) {
            try {
              // Create a raw update using string keys to avoid TypeScript issues with MongoDB operators
              const rawUpdate = {
                $push: {
                  images: {
                    _id: result.insertedId.toString(),
                    filename: image.name,
                    uploadedBy: auth.userId,
                    uploadedAt: new Date(),
                  },
                },
              };

              // Use the raw update object
              const updateResult = await db
                .collection('missions')
                .updateOne({ _id: mongoMissionId }, rawUpdate as any);

              if (updateResult.matchedCount === 0) {
                throw new Error('Mission not found when updating image references');
              }
            } catch (updateError) {
              logger.error(
                'Error updating mission with image reference; rolling back inserted image',
                updateError instanceof Error ? updateError : new Error(String(updateError)),
                { route: '/api/fleet-ops/operations/upload-image', missionId }
              );
              // Compensating delete to keep insert + reference update atomic from the caller's perspective.
              try {
                await db.collection('missionImages').deleteOne({ _id: result.insertedId });
              } catch (rollbackError) {
                logger.error(
                  'Failed to roll back orphaned image after mission update failure',
                  rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError)),
                  {
                    route: '/api/fleet-ops/operations/upload-image',
                    missionId,
                    imageId: result.insertedId.toString(),
                  }
                );
              }
              return NextResponse.json(
                { error: 'Failed to associate image with operation' },
                { status: 500 }
              );
            }
          }

          return NextResponse.json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
              imageId: result.insertedId.toString(),
              filename: image.name,
              contentType: validation.detectedType || image.type,
              size: image.size,
            },
          });
        } else {
          const error = new Error('Failed to insert image into MongoDB');
          logger.error('MongoDB image upload failed, falling back to local storage', error, {
            route: '/api/fleet-ops/operations/upload-image',
            missionId,
          });
        }
      } catch (mongoError) {
        // Log MongoDB error but continue to fallback
        logger.error(
          'MongoDB image upload failed, falling back to local storage',
          mongoError instanceof Error ? mongoError : new Error(String(mongoError)),
          { route: '/api/fleet-ops/operations/upload-image', missionId }
        );
      }
    }

    // Fallback to local file storage
    logger.info('Falling back to local file storage for image upload', {
      route: '/api/fleet-ops/operations/upload-image',
      missionId,
    });
    ensureDirectories();

    // Save image to local file system
    const fileExt = image.name.split('.').pop() || 'jpg';
    const filename = `${imageId}.${fileExt}`;
    const imagePath = path.join(imagesDir, filename);

    fs.writeFileSync(imagePath, buffer);

    // Save metadata
    const metadataPath = path.join(imagesDir, `${imageId}.json`);
    const metadata = {
      id: imageId,
      missionId: missionId,
      filename: image.name,
      contentType: validation.detectedType || image.type,
      size: image.size,
      uploadedBy: auth.userId,
      uploadedAt: new Date().toISOString(),
      storagePath: imagePath,
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Image uploaded successfully (local storage)',
      data: {
        imageId: imageId,
        filename: image.name,
        contentType: validation.detectedType || image.type,
        size: image.size,
      },
    });
  } catch (error) {
    logger.error(
      'Error in upload-image route',
      error instanceof Error ? error : new Error(String(error)),
      { route: '/api/fleet-ops/operations/upload-image' }
    );
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
