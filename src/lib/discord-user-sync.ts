// Discord User Sync Service
// Syncs existing website users with Discord server members to update profiles

import { logger } from '@/lib/logger';
import * as userStorage from '@/lib/user-storage';
import { User } from '@/types/user';
import { parseDiscordRoles } from '@/lib/discord-oauth';

/**
 * Fetch with automatic retry on rate limit (429)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;

      logger.warn(`Discord API rate limited, waiting before retry`, {
        module: 'discord-sync',
        waitMs: waitTime,
        attempt: attempt + 1,
        maxRetries,
      });

      await new Promise((resolve) => setTimeout(resolve, waitTime));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded for Discord API request');
}

interface DiscordGuildMember {
  user: {
    id: string;
    username: string;
    discriminator: string;
    global_name?: string;
    avatar?: string;
  };
  nick?: string;
  roles: string[];
  joined_at: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  hoist: boolean;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
}

interface SyncResult {
  totalUsers: number;
  matchedUsers: number;
  updatedUsers: number;
  errors: string[];
  matches: {
    userId: string;
    aydoHandle: string;
    discordName: string;
    matchedBy: 'discordName' | 'username' | 'nickname';
    division?: string;
    position?: string;
    updated: boolean;
  }[];
}

/**
 * Fetch all members from Discord guild using bot token
 */
async function fetchAllGuildMembers(guildId: string): Promise<DiscordGuildMember[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error('Discord bot token not configured');
  }

  logger.info(`Fetching all members from Discord guild`, { module: 'discord-sync', guildId });

  const members: DiscordGuildMember[] = [];
  let after = '0';
  let hasMore = true;

  // Discord API returns max 1000 members per request, so we need to paginate
  while (hasMore) {
    const response = await fetchWithRetry(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch guild members: ${response.status} ${response.statusText}`);
    }

    const batch: DiscordGuildMember[] = await response.json();
    members.push(...batch);

    if (batch.length < 1000) {
      hasMore = false;
    } else {
      after = batch[batch.length - 1].user.id;
    }

    logger.info(`Fetched Discord members batch`, {
      module: 'discord-sync',
      memberCount: members.length,
    });
  }

  logger.info(`Total Discord members fetched`, {
    module: 'discord-sync',
    totalMembers: members.length,
  });
  return members;
}

/**
 * Fetch Discord guild roles
 */
async function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error('Discord bot token not configured');
  }

  const response = await fetchWithRetry(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch guild roles: ${response.status} ${response.statusText}`);
  }

  const roles: DiscordRole[] = await response.json();
  logger.info(`Fetched Discord roles`, { module: 'discord-sync', roleCount: roles.length });
  return roles;
}

/**
 * Match website users with Discord members
 */
function matchUsersWithDiscordMembers(
  users: User[],
  discordMembers: DiscordGuildMember[]
): { user: User; member: DiscordGuildMember; matchedBy: string }[] {
  const matches: { user: User; member: DiscordGuildMember; matchedBy: string }[] = [];

  logger.info(`Matching website users with Discord members`, {
    module: 'discord-sync',
    userCount: users.length,
    discordMemberCount: discordMembers.length,
  });

  for (const user of users) {
    let match: DiscordGuildMember | null = null;
    let matchedBy = '';

    // First, try to match by stored Discord ID (most reliable)
    if (user.discordId) {
      match = discordMembers.find((member) => member.user.id === user.discordId) || null;
      if (match) {
        matchedBy = 'discordId';
      }
    }

    // If no Discord ID match, try multiple matching strategies
    if (!match && user.discordName) {
      // First try exact match with stored discordName (username#discriminator format)
      match =
        discordMembers.find(
          (member) => `${member.user.username}#${member.user.discriminator}` === user.discordName
        ) || null;
      if (match) {
        matchedBy = 'discordName';
      }

      // If no exact match, try matching just the username part (before #)
      if (!match) {
        const storedUsername = user.discordName.split('#')[0];
        match =
          discordMembers.find(
            (member) => member.user.username.toLowerCase() === storedUsername.toLowerCase()
          ) || null;
        if (match) {
          matchedBy = 'discordNamePartial';
        }
      }
    }

    // Try to match AydoCorp handle with Discord username
    if (!match && user.aydoHandle) {
      match =
        discordMembers.find(
          (member) => member.user.username.toLowerCase() === user.aydoHandle.toLowerCase()
        ) || null;
      if (match) {
        matchedBy = 'aydoHandleUsername';
      }
    }

    // Try to match AydoCorp handle with Discord nickname
    if (!match && user.aydoHandle) {
      match =
        discordMembers.find(
          (member) => member.nick?.toLowerCase() === user.aydoHandle.toLowerCase()
        ) || null;
      if (match) {
        matchedBy = 'aydoHandleNickname';
      }
    }

    // Try fuzzy matching - remove common prefixes/suffixes and special characters.
    // Fuzzy matching is not based on a stable ID, so it is only safe to auto-link
    // when exactly ONE member matches. If several members collapse to the same
    // cleaned handle, the match is ambiguous: skip and flag for manual review
    // rather than linking to an arbitrary first hit.
    if (!match && user.aydoHandle) {
      const cleanHandle = user.aydoHandle
        .toLowerCase()
        .replace(/[\[\](){}]/g, '') // Remove brackets and parentheses
        .replace(/[_-]/g, '') // Remove underscores and hyphens
        .trim();

      const fuzzyCandidates = discordMembers.filter((member) => {
        const cleanUsername = member.user.username
          .toLowerCase()
          .replace(/[\[\](){}]/g, '')
          .replace(/[_-]/g, '')
          .trim();
        const cleanNick = member.nick
          ?.toLowerCase()
          .replace(/[\[\](){}]/g, '')
          .replace(/[_-]/g, '')
          .trim();

        return cleanUsername === cleanHandle || cleanNick === cleanHandle;
      });

      if (fuzzyCandidates.length === 1) {
        match = fuzzyCandidates[0];
        matchedBy = 'fuzzyMatch';
      } else if (fuzzyCandidates.length > 1) {
        logger.warn(`Skipping ambiguous fuzzy Discord match; multiple candidates`, {
          module: 'discord-sync',
          aydoHandle: user.aydoHandle,
          candidateCount: fuzzyCandidates.length,
          candidates: fuzzyCandidates.map((m) => `${m.user.username}#${m.user.discriminator}`),
        });
      }
    }

    // Last resort: check if aydoHandle is contained within Discord username or
    // nickname. This substring match is the weakest signal, so likewise only
    // auto-link when exactly ONE member matches; never persist a discordId from
    // a non-unique substring match.
    if (!match && user.aydoHandle && user.aydoHandle.length > 3) {
      const handleLower = user.aydoHandle.toLowerCase();
      const containsCandidates = discordMembers.filter(
        (member) =>
          member.user.username.toLowerCase().includes(handleLower) ||
          (member.nick?.toLowerCase().includes(handleLower) ?? false)
      );

      if (containsCandidates.length === 1) {
        match = containsCandidates[0];
        matchedBy = 'containsMatch';
      } else if (containsCandidates.length > 1) {
        logger.warn(`Skipping ambiguous 'contains' Discord match; multiple candidates`, {
          module: 'discord-sync',
          aydoHandle: user.aydoHandle,
          candidateCount: containsCandidates.length,
          candidates: containsCandidates.map((m) => `${m.user.username}#${m.user.discriminator}`),
        });
      }
    }

    if (match) {
      matches.push({ user, member: match, matchedBy });
      logger.info(`Matched user with Discord member`, {
        module: 'discord-sync',
        aydoHandle: user.aydoHandle,
        discordUsername: `${match.user.username}#${match.user.discriminator}`,
        matchedBy,
      });
    }
  }

  logger.info(`User matching complete`, {
    module: 'discord-sync',
    matchCount: matches.length,
    totalUsers: users.length,
  });
  return matches;
}

/**
 * Sync all existing users with Discord server data
 */
export async function syncAllUsersWithDiscord(): Promise<SyncResult> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    throw new Error('Discord guild ID not configured');
  }

  logger.info('Starting Discord user sync', { module: 'discord-sync' });

  const result: SyncResult = {
    totalUsers: 0,
    matchedUsers: 0,
    updatedUsers: 0,
    errors: [],
    matches: [],
  };

  try {
    // Fetch all website users
    logger.info('Fetching all website users', { module: 'discord-sync' });
    const users = await userStorage.getAllUsers();
    result.totalUsers = users.length;
    logger.info(`Found website users`, { module: 'discord-sync', userCount: users.length });

    // Fetch all Discord members
    logger.info('Fetching Discord guild members', { module: 'discord-sync' });
    const discordMembers = await fetchAllGuildMembers(guildId);

    // Fetch Discord roles for mapping
    logger.info('Fetching Discord guild roles', { module: 'discord-sync' });
    const guildRoles = await fetchGuildRoles(guildId);

    // Match users with Discord members
    const matches = matchUsersWithDiscordMembers(users, discordMembers);
    result.matchedUsers = matches.length;

    // Update matched users
    logger.info('Updating matched users', { module: 'discord-sync' });
    for (const { user, member, matchedBy } of matches) {
      try {
        // Parse Discord roles to get division and position
        const discordProfile = parseDiscordRoles(
          member.roles,
          guildRoles,
          member.user.username,
          member.nick
        );

        // Prepare update data - always update Discord info when matched
        const correctDiscordName = `${member.user.username}#${member.user.discriminator}`;
        const updateData: Partial<User> = {
          discordId: member.user.id,
          discordName: correctDiscordName,
          discordAvatar: member.user.avatar
            ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
            : null,
          updatedAt: new Date().toISOString(),
        };

        logger.info(`Updating Discord info for user`, {
          module: 'discord-sync',
          aydoHandle: user.aydoHandle,
          previousDiscordName: user.discordName || 'none',
          newDiscordName: correctDiscordName,
        });

        // Only update division/position/paygrade/clearanceLevel if we found them from roles
        if (discordProfile.division) {
          updateData.division = discordProfile.division;
        }
        if (discordProfile.position) {
          updateData.position = discordProfile.position;
        }
        if (discordProfile.payGrade) {
          updateData.payGrade = discordProfile.payGrade;
        }
        // Only set clearance when Discord roles produced a recognized mapping
        // (parseDiscordRoles returns null otherwise). Preserve the user's
        // existing clearance for unmatched role sets rather than downgrading.
        if (discordProfile.clearanceLevel != null) {
          updateData.clearanceLevel = discordProfile.clearanceLevel;
        }

        // Update the user
        const updatedUser = await userStorage.updateUser(user.id, updateData);

        if (updatedUser) {
          result.updatedUsers++;
          result.matches.push({
            userId: user.id,
            aydoHandle: user.aydoHandle,
            discordName: `${member.user.username}#${member.user.discriminator}`,
            matchedBy: matchedBy as any,
            division: discordProfile.division || undefined,
            position: discordProfile.position || undefined,
            updated: true,
          });

          logger.info(`Updated user profile from Discord`, {
            module: 'discord-sync',
            aydoHandle: user.aydoHandle,
            division: discordProfile.division,
            position: discordProfile.position,
            payGrade: discordProfile.payGrade,
            clearanceLevel: discordProfile.clearanceLevel,
          });
        } else {
          result.errors.push(`Failed to update user ${user.aydoHandle}`);
          result.matches.push({
            userId: user.id,
            aydoHandle: user.aydoHandle,
            discordName: `${member.user.username}#${member.user.discriminator}`,
            matchedBy: matchedBy as any,
            updated: false,
          });
        }
      } catch (error) {
        const errorMsg = `Error updating user ${user.aydoHandle}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logger.error(
          `Error updating user during Discord sync`,
          error instanceof Error ? error : undefined,
          {
            module: 'discord-sync',
            aydoHandle: user.aydoHandle,
          }
        );
        result.errors.push(errorMsg);
      }
    }

    logger.info('Discord user sync completed', {
      module: 'discord-sync',
      totalUsers: result.totalUsers,
      matchedUsers: result.matchedUsers,
      updatedUsers: result.updatedUsers,
      errorCount: result.errors.length,
    });

    return result;
  } catch (error) {
    const errorMsg = `Discord sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    logger.error('Discord sync failed', error instanceof Error ? error : undefined, {
      module: 'discord-sync',
    });
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Sync a specific user with Discord data by their user ID
 */
export async function syncSingleUserWithDiscord(userId: string): Promise<SyncResult> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    throw new Error('Discord guild ID not configured');
  }

  logger.info('Syncing single user with Discord', { module: 'discord-sync', userId });

  const result: SyncResult = {
    totalUsers: 1,
    matchedUsers: 0,
    updatedUsers: 0,
    errors: [],
    matches: [],
  };

  try {
    // Get the specific user
    const user = await userStorage.getUserById(userId);
    if (!user) {
      result.errors.push(`User not found: ${userId}`);
      return result;
    }

    // Fetch Discord members and roles
    const discordMembers = await fetchAllGuildMembers(guildId);
    const guildRoles = await fetchGuildRoles(guildId);

    // Match this user with Discord members
    const matches = matchUsersWithDiscordMembers([user], discordMembers);

    if (matches.length === 0) {
      result.errors.push(`No Discord match found for user ${user.aydoHandle}`);
      return result;
    }

    result.matchedUsers = 1;
    const { member, matchedBy } = matches[0];

    // Parse Discord roles and update user
    const discordProfile = parseDiscordRoles(
      member.roles,
      guildRoles,
      member.user.username,
      member.nick
    );

    const updateData: Partial<User> = {
      discordId: member.user.id,
      discordName: `${member.user.username}#${member.user.discriminator}`,
      discordAvatar: member.user.avatar
        ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png`
        : null,
      division: discordProfile.division || user.division,
      position: discordProfile.position || user.position,
      payGrade: discordProfile.payGrade || user.payGrade,
      updatedAt: new Date().toISOString(),
    };

    // Only set clearance when Discord roles produced a recognized mapping
    // (parseDiscordRoles returns null otherwise). Preserve the user's existing
    // clearance for unmatched role sets rather than downgrading to level 1.
    if (discordProfile.clearanceLevel != null) {
      updateData.clearanceLevel = discordProfile.clearanceLevel;
    }

    const updatedUser = await userStorage.updateUser(user.id, updateData);

    if (updatedUser) {
      result.updatedUsers = 1;
      result.matches.push({
        userId: user.id,
        aydoHandle: user.aydoHandle,
        discordName: `${member.user.username}#${member.user.discriminator}`,
        matchedBy: matchedBy as any,
        division: discordProfile.division || undefined,
        position: discordProfile.position || undefined,
        updated: true,
      });
    } else {
      result.errors.push(`Failed to update user ${user.aydoHandle}`);
    }

    return result;
  } catch (error) {
    const errorMsg = `Single user sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    logger.error('Single user sync failed', error instanceof Error ? error : undefined, {
      module: 'discord-sync',
      userId,
    });
    result.errors.push(errorMsg);
    return result;
  }
}
