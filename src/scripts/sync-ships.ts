import { syncShipsFromFleetYards } from '@/lib/ship-sync';

async function main(): Promise<void> {
  const result = await syncShipsFromFleetYards();

  console.log('Ship sync complete');
  console.log(JSON.stringify({
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
  }, null, 2));

  if (result.status === 'failed') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Ship sync failed');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
