import { logger } from '@/lib/logger';
import { MongoClient, Db } from 'mongodb';
import { ensureMongoIndexes } from '@/lib/mongo-indexes';

// Check for either MongoDB URI or CosmosDB connection string
const mongoUri = process.env.MONGODB_URI || process.env.COSMOSDB_CONNECTION_STRING;

// Validate configuration WITHOUT throwing at module-evaluation time. A throw
// here would crash `next build` (which imports every route module to collect
// page data) in any environment that lacks a connection string, e.g. CI builds.
// Fail-closed is still enforced at request time: connectToDatabase() throws when
// `uri` is empty, so production routes return an error instead of running
// unconfigured. In production a missing string is logged as an error so the
// misconfiguration is visible at startup.
if (!mongoUri) {
  if (process.env.NODE_ENV === 'production') {
    logger.error(
      'CRITICAL: MongoDB/CosmosDB connection string is missing in production. ' +
        'Set MONGODB_URI or COSMOSDB_CONNECTION_STRING. Database-backed requests will fail closed.',
      undefined,
      { module: 'mongodb' }
    );
  } else {
    logger.warn('No database connection string found, app will use fallback storage', {
      module: 'mongodb',
    });
  }
}

const uri: string = mongoUri || '';
if (uri && process.env.NODE_ENV !== 'production') {
  logger.info('MongoDB configuration detected', { module: 'mongodb' });
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
// Definite-assignment assertion: only assigned when `uri` is non-empty.
// connectToDatabase() guards with `if (!uri) throw` before reading it.
let clientPromise!: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  // Only construct/connect a client when a connection string is present.
  // Without this guard, an empty URI would crash at module load; instead we
  // leave clientPromise unset so connectToDatabase() can throw a controlled
  // error that fallback-capable storage modules catch.
  if (uri && !globalWithMongo._mongoClientPromise) {
    logger.info('Initializing MongoDB client (development)', { module: 'mongodb' });
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client
      .connect()
      .then((client) => {
        logger.info('MongoDB connected successfully (development)', { module: 'mongodb' });
        return client;
      })
      .catch((error) => {
        logger.error(
          'MongoDB connection error (development)',
          error instanceof Error ? error : undefined,
          { module: 'mongodb' }
        );
        throw error;
      });
  }
  clientPromise = globalWithMongo._mongoClientPromise!;
} else if (uri) {
  // In production mode, it's best to not use a global variable.
  logger.info('Initializing MongoDB client (production)', { module: 'mongodb' });
  client = new MongoClient(uri, options);
  clientPromise = client
    .connect()
    .then((client) => {
      logger.info('MongoDB connected successfully (production)', { module: 'mongodb' });
      return client;
    })
    .catch((error) => {
      logger.error(
        'MongoDB connection error (production)',
        error instanceof Error ? error : undefined,
        { module: 'mongodb' }
      );
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
    ensureMongoIndexes(db).catch((err) => {
      logger.error('Index creation failed', err instanceof Error ? err : undefined, {
        module: 'mongodb',
      });
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
