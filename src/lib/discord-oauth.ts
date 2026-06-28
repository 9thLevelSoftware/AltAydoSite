// Discord OAuth utility functions for fetching user guild information and roles
import { POSITIONS_WITH_CLEARANCE } from '@/lib/discord-role-mappings';

interface DiscordGuildMember {
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  };
  roles: string[];
  nick: string | null;
  joined_at: string;
  premium_since: string | null;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
}

export interface DiscordUserProfile {
  division: string | null;
  position: string | null;
  payGrade: string | null;
  // null = no recognized position/payGrade role was found. Callers must treat
  // this as "unknown" (preserve existing clearance) rather than level 1, so an
  // incomplete role lookup never accidentally downgrades a user.
  clearanceLevel: number | null;
  displayName: string;
  roles: string[];
}

/** Fetch Discord guild member information including roles */
export async function fetchDiscordGuildMember(
  accessToken: string,
  guildId: string
): Promise<DiscordGuildMember | null> {
  try {
    const response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** Fetch Discord guild roles (uses bot token) */
export async function fetchDiscordGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return [];
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/** Parse Discord roles to extract division / position / payGrade / clearance */
export function parseDiscordRoles(
  userRoleIds: string[],
  guildRoles: DiscordRole[],
  discordUsername: string,
  discordNickname?: string | null
): DiscordUserProfile {
  const roleNames = userRoleIds
    .map((id) => guildRoles.find((r) => r.id === id)?.name)
    .filter(Boolean) as string[];
  const displayName = discordNickname || discordUsername;

  // Division inference
  const divisionPatterns = [
    { pattern: /aydoexpress|aydo express/i, division: 'AydoExpress' },
    { pattern: /empyrion industries|empyrion/i, division: 'Empyrion Industries' },
    { pattern: /midnight security|midnight/i, division: 'Midnight Security' },
  ];
  let division: string | null = null;
  for (const rn of roleNames) {
    const hit = divisionPatterns.find((p) => p.pattern.test(rn));
    if (hit) {
      division = hit.division;
      break;
    }
  }

  // Position (exact mapping first)
  let position: string | null = null;
  for (const rn of roleNames) {
    if (rn in POSITIONS_WITH_CLEARANCE) {
      position = rn;
      break;
    }
  }
  // Regex fallback if not matched exactly
  if (!position) {
    const posRegex = [
      /chief .* officer|ceo/i,
      /assistant director/i,
      /^director$/i,
      /sub-director/i,
      /ship captain/i,
      /head pilot/i,
      /flight lead/i,
      /element lead/i,
      /seasoned pilot/i,
      /squad lead/i,
      /team lead/i,
      /senior service agent/i,
      /service agent/i,
      /^pilot$/i,
      /^associate$/i,
      /^trainee$/i,
      /veteran marine/i,
      /seasoned marine/i,
      /experienced marine/i,
      /^marine$/i,
      /marine trainee/i,
      /engineering manager/i,
      /engineering lead/i,
      /veteran engineer/i,
      /seasoned engineer/i,
      /experienced engineer/i,
      /^engineer$/i,
      /engineer trainee/i,
      /gunnery manager/i,
      /gunnery lead/i,
      /veteran gunner/i,
      /seasoned gunner/i,
      /experienced gunner/i,
      /^gunner$/i,
      /gunnery trainee/i,
      /senior employee/i,
      /^employee$/i,
      /^intern$/i,
      /^freelancer$/i,
      /prospective hire/i,
      /seasonal hire/i,
      /^crew$/i,
    ];
    for (const rn of roleNames) {
      if (posRegex.some((r) => r.test(rn))) {
        position = rn;
        break;
      }
    }
  }

  // Pay grade
  const payGradePatterns = [
    { pattern: /^AIC Board$/i, payGrade: 'AIC Board' },
    { pattern: /^Upper Management$/i, payGrade: 'Upper Management' },
    { pattern: /^Lower Management$/i, payGrade: 'Lower Management' },
    { pattern: /^Employee$/i, payGrade: 'Employee' },
    { pattern: /^Freelancer$/i, payGrade: 'Freelancer' },
    { pattern: /^Prospective Hire$/i, payGrade: 'Prospective Hire' },
    { pattern: /^Intern$/i, payGrade: 'Intern' },
  ];
  let payGrade: string | null = null;
  for (const rn of roleNames) {
    const match = payGradePatterns.find((p) => p.pattern.test(rn));
    if (match) {
      payGrade = match.payGrade;
      break;
    }
  }

  if (payGrade === 'AIC Board') {
    division = division || 'AydoCorp HQ';
  }

  const clearanceLevel = getClearanceLevel(position, payGrade);

  return { division, position, payGrade, clearanceLevel, displayName, roles: roleNames };
}

function getClearanceLevel(position: string | null, payGrade: string | null): number | null {
  if (position) {
    const direct = POSITIONS_WITH_CLEARANCE[position as keyof typeof POSITIONS_WITH_CLEARANCE];
    if (direct) return Math.min(5, direct.clearanceLevel || 1);
    const p = position.toLowerCase();
    const heuristics: { test: RegExp; level: number }[] = [
      { test: /chief .* officer|\bceo\b|\bcoo\b|\bcto\b|\bcmo\b|\bcso\b/, level: 5 },
      { test: /director|assistant director|sub-?director/, level: 4 },
      { test: /ship captain|captain/, level: 3 },
      { test: /(head|flight|squad|team|gunnery|engineering) lead/, level: 3 },
      { test: /manager/, level: 3 },
      { test: /seasoned|veteran/, level: 2 },
      { test: /senior/, level: 2 },
      { test: /crew|pilot|marine|engineer|gunner|agent|associate|trainee|hire/, level: 1 },
    ];
    for (const h of heuristics) if (h.test.test(p)) return Math.min(5, h.level);
  }
  // Pay-grade mapping, also acts as a fallback when a position role did not
  // resolve to a clearance level above.
  if (payGrade === 'AIC Board') return 5;
  if (payGrade === 'Upper Management') return 4;
  if (payGrade === 'Lower Management') return 3;
  if (payGrade === 'Employee') return 2;
  if (payGrade === 'Freelancer' || payGrade === 'Prospective Hire' || payGrade === 'Intern')
    return 1;
  // Neither position nor payGrade produced a recognized mapping. Return null so
  // callers can distinguish "no recognized role" from an explicit level 1 and
  // avoid downgrading a user's existing clearance.
  return null;
}

/** Complete Discord profile sync (OAuth) */
export async function syncDiscordProfile(
  accessToken: string,
  discordUserId: string, // retained for compatibility, not used directly
  discordUsername: string
): Promise<DiscordUserProfile> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    return {
      division: null,
      position: null,
      payGrade: null,
      clearanceLevel: null,
      displayName: discordUsername,
      roles: [],
    };
  }
  const member = await fetchDiscordGuildMember(accessToken, guildId);
  if (!member) {
    return {
      division: null,
      position: null,
      payGrade: null,
      clearanceLevel: null,
      displayName: discordUsername,
      roles: [],
    };
  }
  const roles = await fetchDiscordGuildRoles(guildId);
  return parseDiscordRoles(member.roles, roles, discordUsername, member.nick);
}
