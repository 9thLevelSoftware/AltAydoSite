import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { getDiscordService } from '@/lib/discord';
import * as userStorage from '../lib/user-storage';

/**
 * Assign a standard synchronization role ("Synced to AydoDB") to every user
 * in the database who has a Discord presence (discordId or resolvable discordName).
 *
 * Env Vars:
 *  DISCORD_BOT_TOKEN (required)
 *  DISCORD_GUILD_ID (required)
 *  DISCORD_SYNCED_ROLE_NAME (optional, default: "Synced to AydoDB")
 *  DRY_RUN=true (optional; if set, no changes are made)
 *  ROLE_ASSIGN_DELAY_MS=750 (optional pacing between assignments)
 */

function loadEnvFiles() {
  const envFiles = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), 'env.local'),
    path.join(process.cwd(), '.env'),
  ];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      content.split('\n').forEach((line) => {
        if (!line || line.startsWith('#')) return;
        const [k, ...rest] = line.split('=');
        if (k && rest.length) {
          let v = rest.join('=').trim();
          // Strip quotes if present
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (!process.env[k]) process.env[k] = v;
        }
      });
    }
  }
}

async function main() {
  console.log('=== Assign Synced Role Script Start ===');
  loadEnvFiles();

  // Configuration (loaded after env files)
  let roleName = process.env.DISCORD_SYNCED_ROLE_NAME || 'Synced to AydoDB';
  // Extra safety: strip quotes if they somehow made it here (e.g. system env var)
  if (
    (roleName.startsWith('"') && roleName.endsWith('"')) ||
    (roleName.startsWith("'") && roleName.endsWith("'"))
  ) {
    roleName = roleName.slice(1, -1);
  }
  const ROLE_NAME = roleName;

  const DRY_RUN = process.env.DRY_RUN === 'true';
  // Validate pacing delay; fall back to default on invalid/negative values
  const parsedDelay = parseInt(process.env.ROLE_ASSIGN_DELAY_MS || '750', 10);
  const PER_USER_DELAY_MS = Number.isFinite(parsedDelay) && parsedDelay >= 0 ? parsedDelay : 750;
  if (PER_USER_DELAY_MS !== parsedDelay) {
    console.warn(
      `Invalid ROLE_ASSIGN_DELAY_MS="${process.env.ROLE_ASSIGN_DELAY_MS}"; falling back to default ${PER_USER_DELAY_MS}ms.`
    );
  }

  if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) {
    console.error('Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID env vars.');
    process.exit(1);
  }

  console.log(`Role to assign: "${ROLE_NAME}"`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Per-user delay (ms): ${PER_USER_DELAY_MS}`);

  // Fetch users
  const allUsers = await userStorage.getAllUsers();
  const targetUsers = allUsers.filter((u) => !!u.discordId || !!u.discordName);
  console.log(`Total users: ${allUsers.length}`);
  console.log(`Users with discordId or discordName: ${targetUsers.length}`);

  if (targetUsers.length === 0) {
    console.log('No users with Discord data found. Exiting.');
    return;
  }

  const discord = getDiscordService();
  let cleanedUp = false;
  try {
    await discord.initializeBot();

    const role = await discord.ensureRoleByName(ROLE_NAME);
    console.log(`Using role: ${role.name} (${role.id})`);

    // Fetch the guild member list once and build lookup maps so we never refetch
    // the full guild per unresolved user.
    const allMembers = await discord.getAllMembers();
    const membersByName = new Map<string, string>();
    for (const m of allMembers) {
      // Register every name variant we resolve against; first writer wins.
      const keys = [
        m.user.username,
        m.displayName,
        `${m.user.username}#${m.user.discriminator}`,
        m.user.tag,
      ];
      for (const key of keys) {
        if (key && !membersByName.has(key)) {
          membersByName.set(key, m.id);
        }
      }
    }
    console.log(`Fetched ${allMembers.length} guild members for name resolution.`);

    const summary = {
      attempted: 0,
      added: 0,
      skippedAlreadyHas: 0,
      memberMissing: 0,
      errors: 0,
      resolvedIds: 0,
    };

    for (const user of targetUsers) {
      summary.attempted++;
      let discordId = user.discordId || undefined;
      try {
        if (!discordId && user.discordName) {
          const resolvedId = membersByName.get(user.discordName);
          if (resolvedId) {
            discordId = resolvedId;
            summary.resolvedIds++;
            console.log(`Resolved missing discordId for ${user.aydoHandle}: ${discordId}`);
            if (!DRY_RUN) {
              await userStorage.updateUser(user.id, {
                discordId,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
        if (!discordId) {
          console.log(`Skipping ${user.aydoHandle}: no discordId.`);
          continue;
        }
        if (DRY_RUN) {
          console.log(`[DRY-RUN] Would assign role to ${user.aydoHandle}`);
        } else {
          const result = await discord.assignRoleToMember(discordId, role);
          if (result.added) {
            summary.added++;
            console.log(`Added role to ${user.aydoHandle}`);
          } else if (result.reason === 'already_has_role') {
            summary.skippedAlreadyHas++;
            console.log(`Already has role: ${user.aydoHandle}`);
          } else if (result.reason === 'member_not_found') {
            summary.memberMissing++;
            console.log(`Member not found for ${user.aydoHandle}`);
          } else {
            console.log(`No change for ${user.aydoHandle}: ${result.reason}`);
          }
        }
      } catch (e: any) {
        summary.errors++;
        console.error(`Error for ${user.aydoHandle}:`, e?.message || e);
      }
      if (!DRY_RUN && PER_USER_DELAY_MS > 0) {
        await new Promise((r) => setTimeout(r, PER_USER_DELAY_MS));
      }
    }

    console.log('=== Summary ===');
    console.log(summary);
  } finally {
    if (!cleanedUp) {
      cleanedUp = true;
      await discord.cleanup();
    }
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
