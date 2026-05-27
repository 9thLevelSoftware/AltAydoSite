import { logger } from '@/lib/logger';
import type { Db } from 'mongodb';

/**
 * Ensure commonly used indexes exist. This function is idempotent and safe to run multiple times.
 * It catches and logs errors without throwing to avoid impacting runtime behavior.
 */
export async function ensureMongoIndexes(db: Db): Promise<void> {
  try {
    const users = db.collection('users');
    // Non-unique indexes for safety (unique may fail if data already contains duplicates)
    await Promise.all([
      users.createIndex({ id: 1 }).catch(() => {}),
      users.createIndex({ email: 1 }).catch(() => {}),
      users.createIndex({ aydoHandle: 1 }).catch(() => {}),
      users.createIndex({ emailLower: 1 }).catch(() => {}),
      users.createIndex({ aydoHandleLower: 1 }).catch(() => {}),
      users.createIndex({ discordId: 1 }).catch(() => {}), // ADDED: For Discord sync lookups
    ]);
  } catch (err) {
    logger.warn('Index setup (users) skipped or failed', { module: 'mongo-indexes', collection: 'users', error: String(err) });
  }

  try {
    const tokens = db.collection('resetTokens');
    await Promise.all([
      tokens.createIndex({ token: 1 }).catch(() => {}),
      tokens.createIndex({ expiresAt: 1 }).catch(() => {}),
      tokens.createIndex({ used: 1 }).catch(() => {}),
      // TTL index requires a Date field; add if `expiresAtDate` is present
      tokens.createIndex({ expiresAtDate: 1 }, { expireAfterSeconds: 0 }).catch(() => {}),
    ]);
  } catch (err) {
    logger.warn('Index setup (resetTokens) skipped or failed', { module: 'mongo-indexes', collection: 'resetTokens', error: String(err) });
  }

  try {
    const transactions = db.collection('transactions');
    await Promise.all([
      transactions.createIndex({ submittedAt: -1 }).catch(() => {}),
      transactions.createIndex({ submittedBy: 1, submittedAt: -1 }).catch(() => {}),
    ]);
  } catch (err) {
    logger.warn('Index setup (transactions) skipped or failed', { module: 'mongo-indexes', collection: 'transactions', error: String(err) });
  }

  try {
    const missionImages = db.collection('missionImages');
    await Promise.all([
      missionImages.createIndex({ missionId: 1 }).catch(() => {}),
      missionImages.createIndex({ uploadedAt: -1 }).catch(() => {}),
    ]);
  } catch (err) {
    logger.warn('Index setup (missionImages) skipped or failed', { module: 'mongo-indexes', collection: 'missionImages', error: String(err) });
  }

  try {
    const missions = db.collection('missions');
    await Promise.all([
      missions.createIndex({ leaderId: 1, createdAt: -1 }).catch(() => {}),
      missions.createIndex({ status: 1, plannedDateTime: -1 }).catch(() => {}),
      missions.createIndex({ 'participants.shipId': 1, status: 1 }).catch(() => {}), // ADDED: For ship double-booking checks
      missions.createIndex({ 'participants.userId': 1 }).catch(() => {}), // ADDED: For participant lookups
    ]);
  } catch (err) {
    logger.warn('Index setup (missions) skipped or failed', { module: 'mongo-indexes', collection: 'missions', error: String(err) });
  }

  try {
    const ships = db.collection('ships');
    await Promise.all([
      // Primary lookup by FleetYards UUID (unique)
      ships.createIndex({ fleetyardsId: 1 }, { unique: true }).catch(() => {}),
      // Slug lookup for URL-based routes (unique)
      ships.createIndex({ slug: 1 }, { unique: true }).catch(() => {}),
      // Manufacturer filter queries
      ships.createIndex({ 'manufacturer.code': 1 }).catch(() => {}),
      ships.createIndex({ 'manufacturer.slug': 1 }).catch(() => {}),
      // Production status filter
      ships.createIndex({ productionStatus: 1 }).catch(() => {}),
      // Sync housekeeping (find stale records)
      ships.createIndex({ syncVersion: 1 }).catch(() => {}),
      ships.createIndex({ fleetyardsUpdatedAt: 1 }).catch(() => {}),
      // Combined filter: manufacturer + size (common filter combo)
      ships.createIndex({ 'manufacturer.code': 1, size: 1 }).catch(() => {}),
      ships.createIndex({ 'manufacturer.slug': 1, size: 1 }).catch(() => {}),
      // Standalone classification filter (findShips classification parameter)
      ships.createIndex({ classification: 1 }).catch(() => {}),
      // Standalone size filter (findShips size parameter)
      ships.createIndex({ size: 1 }).catch(() => {}),
      // Weighted text index for search relevance (name 10x, manufacturer 5x)
      // Uses warn-level logging so text index failures are visible -- silent
      // swallowing would cause hard-to-debug runtime errors in findShips.
      ships.createIndex(
        { name: 'text', 'manufacturer.name': 'text' },
        { weights: { name: 10, 'manufacturer.name': 5 }, name: 'ships_text_search' }
      ).catch(err => logger.warn('Ships text index creation failed', { module: 'mongo-indexes', collection: 'ships', error: String(err) })),
    ]);
  } catch (err) {
    logger.warn('Index setup (ships) skipped or failed', { module: 'mongo-indexes', collection: 'ships', error: String(err) });
  }

  try {
    const rateLimits = db.collection('rateLimits');
    await Promise.all([
      // Lookup by rate limit key within current window
      rateLimits.createIndex({ key: 1 }).catch(() => {}),
      // TTL index: MongoDB automatically removes documents when expiresAt passes
      rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {}),
    ]);
  } catch (err) {
    logger.warn('Index setup (rateLimits) skipped or failed', { module: 'mongo-indexes', collection: 'rateLimits', error: String(err) });
  }

  try {
    const syncStatus = db.collection('sync-status');
    await Promise.all([
      // Find latest sync by type
      syncStatus.createIndex({ type: 1, lastSyncAt: -1 }).catch(() => {}),
    ]);
  } catch (err) {
    logger.warn('Index setup (sync-status) skipped or failed', { module: 'mongo-indexes', collection: 'sync-status', error: String(err) });
  }

  try {
    const syncLocks = db.collection('sync-locks');
    await Promise.all([
      syncLocks.createIndex({ type: 1 }).catch(() => {}),
      syncLocks.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {}),
    ]);
  } catch (err) {
    logger.warn('Index setup (sync-locks) skipped or failed', { module: 'mongo-indexes', collection: 'sync-locks', error: String(err) });
  }
}
