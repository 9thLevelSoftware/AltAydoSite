import { syncShipsFromFleetYards } from '@/lib/ship-sync';

/**
 * Exit-code contract (so cron jobs / CI can interpret runs correctly):
 *
 *   - 'success' → exit 0. Every ship synced cleanly.
 *   - 'partial' → exit 0 by default. Some ships failed, were deferred, or hit
 *                 fetch/validation/mirror errors, but the bulk of the sync
 *                 succeeded. Treated as non-fatal so a few flaky upstream
 *                 records don't fail the whole job. Set the env flag
 *                 SHIP_SYNC_FAIL_ON_PARTIAL=1 (or pass --fail-on-partial) to
 *                 escalate partial runs to exit 1 when they should require
 *                 intervention.
 *   - 'failed'  → exit 1. The sync produced no usable data.
 *
 * Any thrown error (network outage, unhandled rejection) → exit 1 via the
 * catch handler below.
 */
function shouldFailOnPartial(): boolean {
  const flag = process.env.SHIP_SYNC_FAIL_ON_PARTIAL?.trim().toLowerCase();
  const envEnabled = flag === '1' || flag === 'true' || flag === 'yes';
  const cliEnabled = process.argv.includes('--fail-on-partial');
  return envEnabled || cliEnabled;
}

async function main(): Promise<void> {
  const result = await syncShipsFromFleetYards();

  console.log('Ship sync complete');
  console.log(
    JSON.stringify(
      {
        status: result.status,
        shipCount: result.shipCount,
        newShips: result.newShips,
        updatedShips: result.updatedShips,
        unchangedShips: result.unchangedShips,
        skippedShips: result.skippedShips,
        deferredShips: result.deferredShips ?? 0,
        mirroredImages: result.mirroredImages ?? 0,
        failedImages: result.failedImages ?? 0,
        durationMs: result.durationMs,
        pagesProcessed: result.pagesProcessed,
        errorCount: result.errors.length,
        errors: result.errors.slice(0, 10),
      },
      null,
      2
    )
  );

  if (result.status === 'failed') {
    process.exitCode = 1;
  } else if (result.status === 'partial' && shouldFailOnPartial()) {
    console.warn(
      'Ship sync completed with partial status; failing per SHIP_SYNC_FAIL_ON_PARTIAL/--fail-on-partial.'
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Ship sync failed');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
