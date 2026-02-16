import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { shouldUseMongoDb } from '@/lib/storage-utils';
import { requireAuth } from '@/lib/auth-guards';
import { validateImageBuffer, MAX_IMAGE_SIZE } from '@/lib/file-validation';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '@/lib/logger';

// Setup local storage for fallback
const dataDir = path.join(process.cwd(), 'data');
const imagesDir = path.join(dataDir, 'mission-images');

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
      // For existing missions, verify the user is a participant, leader, or has leadership clearance
      try {
        const { db } = await connectToDatabase();
        let mongoMissionIdForAuth: string | ObjectId = missionId;
        try {
          mongoMissionIdForAuth = new ObjectId(missionId);
        } catch {
          // Use as string if not a valid ObjectId
        }

        const mission = await db.collection('missions').findOne(
          { _id: mongoMissionIdForAuth as any },
          { projection: { leader: 1, participants: 1, createdBy: 1 } }
        );

        if (mission) {
          const isLeader = mission.leader === auth.userId || mission.createdBy === auth.userId;
          const isParticipant = Array.isArray(mission.participants) &&
            mission.participants.some((p: { userId?: string }) => p.userId === auth.userId);
          const hasLeadershipClearance = auth.clearanceLevel >= 3;

          if (!isLeader && !isParticipant && !hasLeadershipClearance) {
            logger.info('RBAC_AUDIT: User denied upload to mission', { route: '/api/fleet-ops/operations/upload-image', userId: auth.userId, missionId, reason: 'not participant/leader' });
            return NextResponse.json(
              { error: 'You must be a participant or leader of this operation to upload images' },
              { status: 403 }
            );
          }
        }
        // If mission not found, allow upload (mission may be in local storage or about to be created)
      } catch (authCheckError) {
        logger.error('Error checking mission ownership for upload', authCheckError instanceof Error ? authCheckError : new Error(String(authCheckError)), { route: '/api/fleet-ops/operations/upload-image', missionId });
        // Fail open for auth check DB errors -- the upload will still be attributed to the user
      }
    }

    // Generate a unique ID for the image
    const imageId = crypto.randomUUID();

    // Try to use MongoDB first
    if (await shouldUseMongoDb()) {
      try {
        logger.info('Storing image in MongoDB', { route: '/api/fleet-ops/operations/upload-image', missionId });
        const { db } = await connectToDatabase();

        // Convert to ObjectId if not a temp ID and if possible
        let mongoMissionId: string | ObjectId = missionId;
        if (!isTempId) {
          try {
            mongoMissionId = new ObjectId(missionId);
          } catch {
            logger.info('Could not convert mission ID to ObjectId, using as string', { route: '/api/fleet-ops/operations/upload-image', missionId });
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
          missionId: mongoMissionId
        };

        const result = await db.collection('missionImages').insertOne(imageDoc);

        if (result.insertedId) {
          // Only try to update mission if it's not a temporary ID
          if (!isTempId) {
            try {
              // Only update if missionId is a valid ObjectId
              if (mongoMissionId instanceof ObjectId) {
                // Create a raw update using string keys to avoid TypeScript issues with MongoDB operators
                const rawUpdate = {
                  "$push": {
                    "images": {
                      "_id": result.insertedId.toString(),
                      "filename": image.name,
                      "uploadedBy": auth.userId,
                      "uploadedAt": new Date()
                    }
                  }
                };

                // Use the raw update object
                await db.collection('missions').updateOne(
                  { _id: mongoMissionId },
                  rawUpdate as any
                );
              }
            } catch (updateError) {
              logger.error('Error updating mission with image reference', updateError instanceof Error ? updateError : new Error(String(updateError)), { route: '/api/fleet-ops/operations/upload-image', missionId });
              // Continue even if we can't update the mission
            }
          }

          return NextResponse.json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
              imageId: result.insertedId.toString(),
              filename: image.name,
              contentType: validation.detectedType || image.type,
              size: image.size
            }
          });
        } else {
          const error = new Error('Failed to insert image into MongoDB');
          logger.error('MongoDB image upload failed, falling back to local storage', error, { route: '/api/fleet-ops/operations/upload-image', missionId });
        }
      } catch (mongoError) {
        // Log MongoDB error but continue to fallback
        logger.error('MongoDB image upload failed, falling back to local storage', mongoError instanceof Error ? mongoError : new Error(String(mongoError)), { route: '/api/fleet-ops/operations/upload-image', missionId });
      }
    }

    // Fallback to local file storage
    logger.info('Falling back to local file storage for image upload', { route: '/api/fleet-ops/operations/upload-image', missionId });
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
      storagePath: imagePath
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Image uploaded successfully (local storage)',
      data: {
        imageId: imageId,
        filename: image.name,
        contentType: validation.detectedType || image.type,
        size: image.size
      }
    });

  } catch (error) {
    logger.error('Error in upload-image route', error instanceof Error ? error : new Error(String(error)), { route: '/api/fleet-ops/operations/upload-image' });
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
