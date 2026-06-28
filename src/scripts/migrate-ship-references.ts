/**
 * Ship Reference Migration Script
 *
 * Converts all ship references across five entity types (users, missions,
 * operations, resources, planned missions) from name strings to FleetYards
 * UUIDs. After running this script, every ship reference in the system will
 * have a `fleetyardsId` field that resolves to a valid ship document in the
 * `ships` collection.
 *
 * Usage:
 *   npm run migrate-ships              # Live migration (writes to storage)
 *   npm run migrate-ships -- --dry-run  # Preview changes without writing
 *
 * Collections migrated:
 *   1. Users        (user-storage API -- handles MongoDB/local fallback)
 *   2. Missions     (MongoDB via connectToDatabase)
 *   3. Planned Missions (MongoDB via connectToDatabase)
 *   4. Operations   (local JSON: data/operations.json)
 *   5. Resources    (local JSON: data/resources.json)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as userStorage from '../lib/user-storage';
import { connectToDatabase } from '../lib/mongodb';
import { buildShipsIndex, resolveShipName, UUID_REGEX, ShipsIndex } from '../lib/ship-name-matcher';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CollectionReport {
  total: number;
  updated: number;
  skipped: number; // already migrated or no ships
  failed: number;
}

interface MigrationMapping {
  collection: string;
  documentId: string;
  fieldPath: string; // e.g., "ships[0].name", "participants[2].shipName"
  originalName: string;
  resolvedName: string;
  fleetyardsId: string;
  strategy: string;
}

interface UnmatchedEntry {
  collection: string;
  documentId: string;
  fieldPath: string;
  name: string;
}

interface MigrationReport {
  startedAt: string;
  completedAt?: string;
  dryRun: boolean;
  collections: Record<string, CollectionReport>;
  mappings: MigrationMapping[];
  unmatchedNames: UnmatchedEntry[];
  totalProcessed: number;
  totalUpdated: number;
  totalSkipped: number;
  totalFailed: number;
}

// ---------------------------------------------------------------------------
// User Ships Migration
// ---------------------------------------------------------------------------

async function migrateUserShips(
  index: ShipsIndex,
  report: MigrationReport,
  dryRun: boolean
): Promise<void> {
  console.log('\nMIGRATION: [users] Starting user ships migration...');

  const collectionReport: CollectionReport = {
    total: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    const users = await userStorage.getAllUsers();
    console.log(`MIGRATION: [users] Found ${users.length} users`);

    for (const user of users) {
      collectionReport.total++;

      if (!user.ships || user.ships.length === 0) {
        collectionReport.skipped++;
        continue;
      }

      let anyUpdated = false;
      const migratedShips = user.ships.map((ship, idx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const shipAny = ship as any;

        // Idempotency check: skip if already migrated with valid UUID
        if (
          shipAny.fleetyardsId &&
          typeof shipAny.fleetyardsId === 'string' &&
          UUID_REGEX.test(shipAny.fleetyardsId)
        ) {
          return ship;
        }

        const match = resolveShipName(ship.name, index);
        const fieldPath = `ships[${idx}].name`;

        if (match) {
          report.mappings.push({
            collection: 'users',
            documentId: user.id,
            fieldPath,
            originalName: ship.name,
            resolvedName: match.matchedName,
            fleetyardsId: match.fleetyardsId,
            strategy: match.strategy,
          });
          anyUpdated = true;
          return { ...ship, fleetyardsId: match.fleetyardsId };
        } else {
          report.unmatchedNames.push({
            collection: 'users',
            documentId: user.id,
            fieldPath,
            name: ship.name,
          });
          return ship;
        }
      });

      if (anyUpdated) {
        if (!dryRun) {
          try {
            await userStorage.updateUser(user.id, { ships: migratedShips as typeof user.ships });
            collectionReport.updated++;
          } catch (err) {
            console.error(`MIGRATION: [users] Failed to update user ${user.id}:`, err);
            collectionReport.failed++;
          }
        } else {
          collectionReport.updated++;
        }
      } else {
        collectionReport.skipped++;
      }
    }
  } catch (err) {
    console.error('MIGRATION: [users] Error reading users:', err);
    collectionReport.failed++;
  }

  report.collections.users = collectionReport;
  console.log(
    `MIGRATION: [users] Done -- ${collectionReport.total} total, ` +
      `${collectionReport.updated} updated, ${collectionReport.skipped} skipped, ` +
      `${collectionReport.failed} failed`
  );
}

// ---------------------------------------------------------------------------
// Missions Migration
// ---------------------------------------------------------------------------

async function migrateMissions(
  index: ShipsIndex,
  report: MigrationReport,
  dryRun: boolean
): Promise<void> {
  console.log('\nMIGRATION: [missions] Starting missions migration...');

  const collectionReport: CollectionReport = {
    total: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    const { db } = await connectToDatabase();
    const missions = await db.collection('missions').find({}).toArray();
    console.log(`MIGRATION: [missions] Found ${missions.length} missions`);

    for (const mission of missions) {
      collectionReport.total++;

      const participants = mission.participants as Array<Record<string, unknown>> | undefined;
      if (!participants || participants.length === 0) {
        collectionReport.skipped++;
        continue;
      }

      let anyUpdated = false;
      const updatedParticipants = participants.map((participant, idx) => {
        const shipName = participant.shipName as string | undefined;
        if (!shipName) {
          return participant;
        }

        // Idempotency check
        if (
          participant.fleetyardsId &&
          typeof participant.fleetyardsId === 'string' &&
          UUID_REGEX.test(participant.fleetyardsId as string)
        ) {
          return participant;
        }

        const match = resolveShipName(shipName, index);
        const fieldPath = `participants[${idx}].shipName`;

        if (match) {
          report.mappings.push({
            collection: 'missions',
            documentId: mission._id.toString(),
            fieldPath,
            originalName: shipName,
            resolvedName: match.matchedName,
            fleetyardsId: match.fleetyardsId,
            strategy: match.strategy,
          });
          anyUpdated = true;
          return { ...participant, fleetyardsId: match.fleetyardsId };
        } else {
          report.unmatchedNames.push({
            collection: 'missions',
            documentId: mission._id.toString(),
            fieldPath,
            name: shipName,
          });
          return participant;
        }
      });

      if (anyUpdated) {
        if (!dryRun) {
          try {
            // Filter on the fetched document's own _id for a reliable match.
            // Mongo documents always carry an ObjectId _id, so this targets the
            // exact record regardless of any legacy string `id` field.
            const result = await db
              .collection('missions')
              .updateOne({ _id: mission._id }, { $set: { participants: updatedParticipants } });
            if (result.matchedCount > 0) {
              collectionReport.updated++;
            } else {
              console.warn(
                `MIGRATION: [missions] No document matched _id ${mission._id.toString()} -- update not applied`
              );
              collectionReport.failed++;
            }
          } catch (err) {
            console.error(
              `MIGRATION: [missions] Failed to update mission ${mission._id.toString()}:`,
              err
            );
            collectionReport.failed++;
          }
        } else {
          collectionReport.updated++;
        }
      } else {
        collectionReport.skipped++;
      }
    }
  } catch (err) {
    console.error('MIGRATION: [missions] Error:', err);
    collectionReport.failed++;
  }

  report.collections.missions = collectionReport;
  console.log(
    `MIGRATION: [missions] Done -- ${collectionReport.total} total, ` +
      `${collectionReport.updated} updated, ${collectionReport.skipped} skipped, ` +
      `${collectionReport.failed} failed`
  );
}

// ---------------------------------------------------------------------------
// Planned Missions Migration
// ---------------------------------------------------------------------------

async function migratePlannedMissions(
  index: ShipsIndex,
  report: MigrationReport,
  dryRun: boolean
): Promise<void> {
  console.log('\nMIGRATION: [planned-missions] Starting planned missions migration...');

  const collectionReport: CollectionReport = {
    total: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    const { db } = await connectToDatabase();
    const plannedMissions = await db.collection('planned-missions').find({}).toArray();
    console.log(`MIGRATION: [planned-missions] Found ${plannedMissions.length} planned missions`);

    for (const mission of plannedMissions) {
      collectionReport.total++;

      const ships = mission.ships as Array<Record<string, unknown>> | undefined;
      if (!ships || ships.length === 0) {
        collectionReport.skipped++;
        continue;
      }

      let anyUpdated = false;
      const updatedShips = ships.map((ship, idx) => {
        const shipName = ship.shipName as string | undefined;
        if (!shipName) {
          return ship;
        }

        // Idempotency check
        if (
          ship.fleetyardsId &&
          typeof ship.fleetyardsId === 'string' &&
          UUID_REGEX.test(ship.fleetyardsId as string)
        ) {
          return ship;
        }

        const match = resolveShipName(shipName, index);
        const fieldPath = `ships[${idx}].shipName`;

        if (match) {
          report.mappings.push({
            collection: 'planned-missions',
            documentId: mission._id.toString(),
            fieldPath,
            originalName: shipName,
            resolvedName: match.matchedName,
            fleetyardsId: match.fleetyardsId,
            strategy: match.strategy,
          });
          anyUpdated = true;
          return { ...ship, fleetyardsId: match.fleetyardsId };
        } else {
          report.unmatchedNames.push({
            collection: 'planned-missions',
            documentId: mission._id.toString(),
            fieldPath,
            name: shipName,
          });
          return ship;
        }
      });

      if (anyUpdated) {
        if (!dryRun) {
          try {
            // Filter on the fetched document's own _id for a reliable match.
            const result = await db
              .collection('planned-missions')
              .updateOne({ _id: mission._id }, { $set: { ships: updatedShips } });
            if (result.matchedCount > 0) {
              collectionReport.updated++;
            } else {
              console.warn(
                `MIGRATION: [planned-missions] No document matched _id ${mission._id.toString()} -- update not applied`
              );
              collectionReport.failed++;
            }
          } catch (err) {
            console.error(
              `MIGRATION: [planned-missions] Failed to update mission ${mission._id.toString()}:`,
              err
            );
            collectionReport.failed++;
          }
        } else {
          collectionReport.updated++;
        }
      } else {
        collectionReport.skipped++;
      }
    }
  } catch (err) {
    console.error('MIGRATION: [planned-missions] Error:', err);
    collectionReport.failed++;
  }

  report.collections.plannedMissions = collectionReport;
  console.log(
    `MIGRATION: [planned-missions] Done -- ${collectionReport.total} total, ` +
      `${collectionReport.updated} updated, ${collectionReport.skipped} skipped, ` +
      `${collectionReport.failed} failed`
  );
}

// ---------------------------------------------------------------------------
// Operations Migration
// ---------------------------------------------------------------------------

async function migrateOperations(
  index: ShipsIndex,
  report: MigrationReport,
  dryRun: boolean
): Promise<void> {
  console.log('\nMIGRATION: [operations] Starting operations migration...');

  const collectionReport: CollectionReport = {
    total: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  const filePath = path.resolve(process.cwd(), 'data', 'operations.json');

  try {
    if (!fs.existsSync(filePath)) {
      console.log('MIGRATION: [operations] data/operations.json not found -- skipping');
      report.collections.operations = collectionReport;
      return;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const operations = JSON.parse(raw) as Array<Record<string, unknown>>;

    if (!Array.isArray(operations) || operations.length === 0) {
      console.log('MIGRATION: [operations] No operations found -- skipping');
      report.collections.operations = collectionReport;
      return;
    }

    console.log(`MIGRATION: [operations] Found ${operations.length} operations`);

    let anyFileUpdated = false;

    for (const operation of operations) {
      collectionReport.total++;

      const participants = operation.participants as Array<Record<string, unknown>> | undefined;
      if (!participants || participants.length === 0) {
        collectionReport.skipped++;
        continue;
      }

      let anyUpdated = false;

      for (let idx = 0; idx < participants.length; idx++) {
        const participant = participants[idx];
        const shipName = participant.shipName as string | undefined;
        if (!shipName) {
          continue;
        }

        // Idempotency check
        if (
          participant.fleetyardsId &&
          typeof participant.fleetyardsId === 'string' &&
          UUID_REGEX.test(participant.fleetyardsId as string)
        ) {
          continue;
        }

        const match = resolveShipName(shipName, index);
        const fieldPath = `participants[${idx}].shipName`;

        if (match) {
          report.mappings.push({
            collection: 'operations',
            documentId: operation.id as string,
            fieldPath,
            originalName: shipName,
            resolvedName: match.matchedName,
            fleetyardsId: match.fleetyardsId,
            strategy: match.strategy,
          });
          participant.fleetyardsId = match.fleetyardsId;
          anyUpdated = true;
        } else {
          report.unmatchedNames.push({
            collection: 'operations',
            documentId: operation.id as string,
            fieldPath,
            name: shipName,
          });
        }
      }

      if (anyUpdated) {
        collectionReport.updated++;
        anyFileUpdated = true;
      } else {
        collectionReport.skipped++;
      }
    }

    if (anyFileUpdated && !dryRun) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(operations, null, 2), 'utf8');
      } catch (err) {
        console.error('MIGRATION: [operations] Failed to write operations.json:', err);
        collectionReport.failed++;
      }
    }
  } catch (err) {
    console.error('MIGRATION: [operations] Error:', err);
    collectionReport.failed++;
  }

  report.collections.operations = collectionReport;
  console.log(
    `MIGRATION: [operations] Done -- ${collectionReport.total} total, ` +
      `${collectionReport.updated} updated, ${collectionReport.skipped} skipped, ` +
      `${collectionReport.failed} failed`
  );
}

// ---------------------------------------------------------------------------
// Resources Migration
// ---------------------------------------------------------------------------

async function migrateResources(
  index: ShipsIndex,
  report: MigrationReport,
  dryRun: boolean
): Promise<void> {
  console.log('\nMIGRATION: [resources] Starting resources migration...');

  const collectionReport: CollectionReport = {
    total: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  const filePath = path.resolve(process.cwd(), 'data', 'resources.json');

  try {
    if (!fs.existsSync(filePath)) {
      console.log('MIGRATION: [resources] data/resources.json not found -- skipping');
      report.collections.resources = collectionReport;
      return;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const resources = JSON.parse(raw) as Array<Record<string, unknown>>;

    if (!Array.isArray(resources) || resources.length === 0) {
      console.log('MIGRATION: [resources] No resources found -- skipping');
      report.collections.resources = collectionReport;
      return;
    }

    console.log(`MIGRATION: [resources] Found ${resources.length} resources`);

    let anyFileUpdated = false;

    for (const resource of resources) {
      // Only migrate resources of type 'Ship'
      if (resource.type !== 'Ship') {
        continue;
      }

      collectionReport.total++;

      const name = resource.name as string | undefined;
      if (!name) {
        collectionReport.skipped++;
        continue;
      }

      // Idempotency check
      if (
        resource.fleetyardsId &&
        typeof resource.fleetyardsId === 'string' &&
        UUID_REGEX.test(resource.fleetyardsId as string)
      ) {
        collectionReport.skipped++;
        continue;
      }

      const match = resolveShipName(name, index);
      const fieldPath = 'name';

      if (match) {
        report.mappings.push({
          collection: 'resources',
          documentId: resource.id as string,
          fieldPath,
          originalName: name,
          resolvedName: match.matchedName,
          fleetyardsId: match.fleetyardsId,
          strategy: match.strategy,
        });
        resource.fleetyardsId = match.fleetyardsId;
        collectionReport.updated++;
        anyFileUpdated = true;
      } else {
        report.unmatchedNames.push({
          collection: 'resources',
          documentId: resource.id as string,
          fieldPath,
          name,
        });
        collectionReport.skipped++;
      }
    }

    if (anyFileUpdated && !dryRun) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(resources, null, 2), 'utf8');
      } catch (err) {
        console.error('MIGRATION: [resources] Failed to write resources.json:', err);
        collectionReport.failed++;
      }
    }
  } catch (err) {
    console.error('MIGRATION: [resources] Error:', err);
    collectionReport.failed++;
  }

  report.collections.resources = collectionReport;
  console.log(
    `MIGRATION: [resources] Done -- ${collectionReport.total} total, ` +
      `${collectionReport.updated} updated, ${collectionReport.skipped} skipped, ` +
      `${collectionReport.failed} failed`
  );
}

// ---------------------------------------------------------------------------
// Report Printer
// ---------------------------------------------------------------------------

function printReport(report: MigrationReport): void {
  const startTime = new Date(report.startedAt).getTime();
  const endTime = report.completedAt ? new Date(report.completedAt).getTime() : Date.now();
  const durationSec = ((endTime - startTime) / 1000).toFixed(1);

  const line = '========================================';

  console.log(`\n${line}`);
  console.log('SHIP REFERENCE MIGRATION REPORT');
  console.log(line);
  console.log(`Mode: ${report.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`Started: ${report.startedAt}`);
  console.log(`Completed: ${report.completedAt || 'N/A'}`);
  console.log(`Duration: ${durationSec}s`);

  console.log('\n--- Collection Summary ---');

  const colNames: Array<[string, string]> = [
    ['users', 'Users'],
    ['missions', 'Missions'],
    ['plannedMissions', 'Planned Missions'],
    ['operations', 'Operations'],
    ['resources', 'Resources'],
  ];

  for (const [key, label] of colNames) {
    const col = report.collections[key];
    if (col) {
      const padded = (label + ':').padEnd(18);
      console.log(
        `${padded} ${col.total} total, ${col.updated} updated, ` +
          `${col.skipped} skipped, ${col.failed} failed`
      );
    } else {
      const padded = (label + ':').padEnd(18);
      console.log(`${padded} (not processed)`);
    }
  }

  console.log('\n--- Totals ---');
  console.log(`Total documents: ${report.totalProcessed}`);
  console.log(`Total updated:   ${report.totalUpdated}`);
  console.log(`Total skipped:   ${report.totalSkipped}`);
  console.log(`Total failed:    ${report.totalFailed}`);

  console.log(`\n--- Name Mappings (${report.mappings.length} total) ---`);
  for (const m of report.mappings) {
    console.log(
      `[${m.collection}] doc:${m.documentId} ${m.fieldPath}: ` +
        `"${m.originalName}" -> "${m.resolvedName}" (${m.strategy})`
    );
  }

  console.log(`\n--- Unmatched Names (${report.unmatchedNames.length} total) ---`);
  for (const u of report.unmatchedNames) {
    console.log(
      `[${u.collection}] doc:${u.documentId} ${u.fieldPath}: ` + `"${u.name}" -- NO MATCH FOUND`
    );
  }

  const result =
    report.unmatchedNames.length === 0
      ? 'SUCCESS (0 unmatched)'
      : `PARTIAL (${report.unmatchedNames.length} unmatched names)`;

  console.log(`\n${line}`);
  console.log(`RESULT: ${result}`);
  console.log(line);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('MIGRATION: Running in DRY-RUN mode (no writes)');
  } else {
    console.log('MIGRATION: Running in LIVE mode');
  }

  // Build the ships lookup index
  const index = await buildShipsIndex();
  console.log(`MIGRATION: Loaded ${index.byName.size} ships into lookup index`);

  // Initialize report
  const report: MigrationReport = {
    startedAt: new Date().toISOString(),
    dryRun,
    collections: {},
    mappings: [],
    unmatchedNames: [],
    totalProcessed: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    totalFailed: 0,
  };

  // Run each collection migration sequentially
  await migrateUserShips(index, report, dryRun);
  await migrateMissions(index, report, dryRun);
  await migratePlannedMissions(index, report, dryRun);
  await migrateOperations(index, report, dryRun);
  await migrateResources(index, report, dryRun);

  // Compute totals
  report.completedAt = new Date().toISOString();
  for (const key of Object.keys(report.collections)) {
    const col = report.collections[key];
    report.totalProcessed += col.total;
    report.totalUpdated += col.updated;
    report.totalSkipped += col.skipped;
    report.totalFailed += col.failed;
  }

  // Print the report
  printReport(report);

  // Exit code: 0 if no unmatched, 1 if any unmatched
  if (report.unmatchedNames.length > 0) {
    console.log(
      `\nMIGRATION: Exiting with code 1 (${report.unmatchedNames.length} unmatched names)`
    );
    process.exit(1);
  } else {
    console.log('\nMIGRATION: Exiting with code 0 (all names matched)');
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------
// Module guard
// ---------------------------------------------------------------------------

if (require.main === module) {
  main().catch((err) => {
    console.error('MIGRATION: Fatal error:', err);
    process.exit(1);
  });
}
