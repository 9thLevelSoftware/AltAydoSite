import { MongoClient, Db } from 'mongodb';
import { ensureMongoIndexes } from '@/lib/mongo-indexes';

// Check for either MongoDB URI or CosmosDB connection string
const mongoUri = process.env.MONGODB_URI || process.env.COSMOSDB_CONNECTION_STRING;

// Strict validation for production environments
if (!mongoUri) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL: MongoDB/CosmosDB connection string is required in production. ' +
      'Set MONGODB_URI or COSMOSDB_CONNECTION_STRING in environment variables.'
    );
  } else {
    console.warn('WARNING: No database connection string found. App will use fallback storage.');
  }
}

const uri: string = mongoUri || '';
if (uri && process.env.NODE_ENV !== 'production') {
  console.log('MongoDB configuration detected');
}

// Canonical database name -- always explicit, never rely on connection string default
const DATABASE_ID = process.env.COSMOS_DATABASE_ID || 'aydocorp-database';

// Options optimized for vCore MongoDB (single pool, 50 max)
const options = {
  maxPoolSize: 50,
  minPoolSize: 2,
  maxIdleTimeMS: 120000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 30000,
  waitQueueTimeoutMS: 15000,
  retryWrites: false,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  };

  if (!globalWithMongo._mongoClientPromise) {
    console.log('Initializing MongoDB client (development)...');
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect()
      .then((client) => {
        console.log('MongoDB connected successfully (development)');
        return client;
      })
      .catch((error) => {
        console.error('MongoDB connection error (development):', error);
        throw error;
      });
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  console.log('Initializing MongoDB client (production)...');
  client = new MongoClient(uri, options);
  clientPromise = client.connect()
    .then((client) => {
      console.log('MongoDB connected successfully (production)');
      return client;
    })
    .catch((error) => {
      console.error('MongoDB connection error (production):', error);
      throw error;
    });
}

// Once-per-process guard for index creation
let indexesEnsured = false;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (!uri) {
    throw new Error('Please add your MongoDB URI or CosmosDB connection string to .env.local');
  }
  const client = await clientPromise;
  const db = client.db(DATABASE_ID);

  if (!indexesEnsured) {
    indexesEnsured = true;
    ensureMongoIndexes(db).catch(err => {
      console.error('Index creation failed:', err);
      indexesEnsured = false; // Allow retry on next call
    });
  }

  return { client, db };
}

/**
 * Convenience helper -- returns just the Db instance.
 * Preferred import for storage modules that don't need the raw MongoClient.
 */
export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

export { clientPromise };
