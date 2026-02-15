import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { shouldUseMongoDb } from '@/lib/storage-utils';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const missionId = formData.get('missionId') as string;

    if (!image) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    if (!missionId) {
      return NextResponse.json({ error: 'Mission ID is required' }, { status: 400 });
    }

    // Validate file
    if (image.size > 5000000) { // 5MB limit
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Get file buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate a unique ID for the image
    const imageId = crypto.randomUUID();

    // Try to use MongoDB first
    if (await shouldUseMongoDb()) {
      try {
        console.log('Storing image in MongoDB...');
        const { db } = await connectToDatabase();

        // Check if it's a temporary ID (starts with 'temp-')
        const isTempId = missionId.startsWith('temp-');
        
        // Convert to ObjectId if not a temp ID and if possible
        let mongoMissionId: string | ObjectId = missionId;
        if (!isTempId) {
          try {
            mongoMissionId = new ObjectId(missionId);
          } catch (err) {
            console.log('Could not convert mission ID to ObjectId, using as string');
          }
        }

        // Store image in MongoDB
        const imageDoc = {
          filename: image.name,
          contentType: image.type,
          size: image.size,
          uploadedBy: session.user.id,
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
                      "uploadedBy": session.user.id,
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
              console.error('Error updating mission with image reference:', updateError);
              // Continue even if we can't update the mission
            }
          }

          return NextResponse.json({ 
            success: true,
            message: 'Image uploaded successfully',
            data: {
              imageId: result.insertedId.toString(),
              filename: image.name,
              contentType: image.type,
              size: image.size
            }
          });
        } else {
          const error = new Error('Failed to insert image into MongoDB');
          console.error('MongoDB image upload failed, falling back to local storage:', error);
        }
      } catch (mongoError) {
        // Log MongoDB error but continue to fallback
        console.error('MongoDB image upload failed, falling back to local storage:', mongoError);
      }
    }

    // Fallback to local file storage
    console.log('Falling back to local file storage for image upload...');
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
      contentType: image.type,
      size: image.size,
      uploadedBy: session.user.id,
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
        contentType: image.type,
        size: image.size
      }
    });

  } catch (error) {
    console.error('Error in upload-image route:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}