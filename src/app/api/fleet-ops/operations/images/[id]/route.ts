import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import { shouldUseMongoDb } from '@/lib/storage-utils';

// Local storage paths
const dataDir = path.join(process.cwd(), 'data');
const imagesDir = path.join(dataDir, 'mission-images');

// Helper function to create a MongoDB filter that works with both ObjectId and string IDs
function createIdFilter(id: string): any {
  try {
    // Try to convert to ObjectId
    const objectId = new ObjectId(id);
    return { _id: objectId };
  } catch (error) {
    // If it's not a valid ObjectId, use alternatives
    return { 
      $or: [
        { _id: id },
        { id: id },
        { temporaryId: id }
      ]
    };
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const imageId = id;
    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    console.log(`Retrieving image with ID: ${imageId}`);

    // Try to retrieve from MongoDB first
    if (await shouldUseMongoDb()) {
      try {
        const { db } = await connectToDatabase();

        // Create a filter that works with the ID format
        const filter = createIdFilter(imageId);
        const image = await db.collection('missionImages').findOne(filter);

        if (image && image.data) {
          console.log(`Found image in MongoDB: ${image.filename}`);
          
          // Return the image with the correct content type
          const etag = 'W/"' + (image._id?.toString() || image.filename) + '-' + (image.uploadedAt?.getTime?.() || 0) + '"';
          if (request.headers.get('if-none-match') === etag) {
            return new Response(null, { status: 304 });
          }
          return new Response(image.data.buffer, {
            headers: {
              'Content-Type': image.contentType,
              'Cache-Control': 'public, max-age=31536000, immutable',
              'ETag': etag,
            }
          });
        }
      } catch (mongoError) {
        console.error('Error retrieving image from MongoDB:', mongoError);
        // Fall back to local file system
      }
    }

    // Try to find image in local file system
    console.log('Checking for image in local storage...');
    
    // Check for metadata file
    const metadataPath = path.join(imagesDir, `${imageId}.json`);
    
    if (fs.existsSync(metadataPath)) {
      try {
        // Read the metadata
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        
        // Read the image file
        const imagePath = metadata.storagePath || path.join(imagesDir, `${imageId}.${metadata.filename.split('.').pop()}`);
        
        if (fs.existsSync(imagePath)) {
          console.log(`Found image in local storage: ${metadata.filename}`);
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
              'Cache-Control': 'public, max-age=31536000, immutable',
              'ETag': etag,
            }
          });
        }
      } catch (fsError) {
        console.error('Error reading image from local storage:', fsError);
      }
    }

    // If all methods fail, return 404
    console.log(`Image not found: ${imageId}`);
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    
  } catch (error) {
    console.error('Error in get-image route:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 