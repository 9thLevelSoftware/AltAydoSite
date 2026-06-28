/**
 * Next.js Instrumentation Hook
 *
 * Runs once on server startup. Used to initialize background processes
 * like the ship sync cron scheduler.
 *
 * Next.js 15 supports instrumentation.ts in src/ without experimental flags.
 * Dynamic import is used to keep node-cron out of the Edge runtime bundle.
 */
export async function register() {
  // Only run cron scheduler on the Node.js server runtime
  // (not during build, not in Edge runtime).
  //
  // Gate the import on the same opt-in flag checked inside startShipSyncCron()
  // so the ship-sync module (and its transitive deps, e.g. node-cron) is only
  // loaded when the in-process cron is actually enabled. Wrap in try/catch so a
  // failure to load or start the scheduler never crashes server startup.
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.SHIP_SYNC_IN_PROCESS_CRON_ENABLED === 'true'
  ) {
    try {
      const { startShipSyncCron } = await import('./lib/ship-sync');
      startShipSyncCron();
    } catch (error) {
      console.warn('[instrumentation] Failed to start ship sync cron scheduler:', error);
    }
  }
}
