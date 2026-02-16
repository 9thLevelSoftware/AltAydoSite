import { logger } from '@/lib/logger';
import { DiscordScheduledEvent, DiscordEventStatus, DiscordEntityType, DiscordPrivacyLevel } from '@/types/DiscordEvent';
import { Client, GatewayIntentBits, Guild, GuildMember, Role } from 'discord.js';

// Discord API configuration
const DISCORD_API_BASE = 'https://discord.com/api/v10';

// Interface for creating Discord events
export interface CreateDiscordEventParams {
  name: string;
  description?: string;
  scheduledStartTime: string; // ISO 8601 timestamp
  scheduledEndTime?: string;  // ISO 8601 timestamp (optional)
  location?: string;          // For external events
  image?: string;             // Base64 encoded image data (optional)
}

// Interface for Discord event RSVP user
export interface DiscordEventUser {
  user_id: string;
  user: {
    id: string;
    username: string;
    discriminator?: string;
    avatar?: string;
    global_name?: string;
  };
  member?: {
    nick?: string;
    avatar?: string;
  };
}

export class DiscordService {
  private botToken: string;
  private guildId: string;
  private client: Client | null = null;
  private guild: Guild | null = null;

  constructor() {
    this.botToken = process.env.DISCORD_BOT_TOKEN || '';
    this.guildId = process.env.DISCORD_GUILD_ID || '';
  }

  /**
   * Fetch scheduled events from Discord API
   */
  async getScheduledEvents(): Promise<DiscordScheduledEvent[]> {
    if (!this.botToken || !this.guildId) {
      throw new Error('Discord configuration missing');
    }

    const response = await fetch(
      `${DISCORD_API_BASE}/guilds/${this.guildId}/scheduled-events?with_recurrence=1`,
      {
        headers: {
          'Authorization': `Bot ${this.botToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord API error: ${response.status} - ${errorText}`);
    }

    const events: DiscordScheduledEvent[] = await response.json();
    return events.filter(event =>
      event.status === DiscordEventStatus.SCHEDULED ||
      event.status === DiscordEventStatus.ACTIVE
    );
  }

  /**
   * Get a single scheduled event by ID
   */
  async getScheduledEvent(eventId: string): Promise<DiscordScheduledEvent | null> {
    if (!this.botToken || !this.guildId) {
      throw new Error('Discord configuration missing');
    }

    const response = await fetch(
      `${DISCORD_API_BASE}/guilds/${this.guildId}/scheduled-events/${eventId}`,
      {
        headers: {
          'Authorization': `Bot ${this.botToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorText = await response.text();
      throw new Error(`Discord API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Initialize Discord bot client for role monitoring
   */
  async initializeBot(): Promise<void> {
    if (!this.botToken || !this.guildId) {
      throw new Error('Discord configuration missing');
    }

    if (this.client) {
      return; // Already initialized
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
      ]
    });

    return new Promise((resolve, reject) => {
      this.client!.once('ready', async () => {
        logger.info('Discord bot logged in', { module: 'discord', botTag: this.client!.user?.tag });

        try {
          this.guild = await this.client!.guilds.fetch(this.guildId);
          logger.info('Connected to Discord guild', { module: 'discord', guildName: this.guild.name });
          resolve();
        } catch (error) {
          logger.error('Error fetching guild', error instanceof Error ? error : undefined, { module: 'discord' });
          reject(error);
        }
      });

      this.client!.once('error', (error) => {
        logger.error('Discord client error', error, { module: 'discord' });
        reject(error);
      });

      this.client!.login(this.botToken).catch(reject);
    });
  }

  /**
   * Get all members from the Discord guild
   */
  async getAllMembers(): Promise<GuildMember[]> {
    if (!this.guild) {
      await this.initializeBot();
    }

    if (!this.guild) {
      throw new Error('Guild not available');
    }

    // Fetch all members (this might take some time for large servers)
    const members = await this.guild.members.fetch();
    return Array.from(members.values());
  }

  /**
   * Get member by Discord username or display name
   */
  async getMemberByName(discordName: string): Promise<GuildMember | null> {
    if (!this.guild) {
      await this.initializeBot();
    }

    if (!this.guild) {
      throw new Error('Guild not available');
    }

    const members = await this.guild.members.fetch();
    
    // Try to find by username, display name, or username#discriminator format
    const member = members.find(m => 
      m.user.username === discordName ||
      m.displayName === discordName ||
      `${m.user.username}#${m.user.discriminator}` === discordName ||
      m.user.tag === discordName
    );

    return member || null;
  }

  /**
   * Get roles for a specific member
   */
  async getMemberRoles(member: GuildMember): Promise<Role[]> {
    return Array.from(member.roles.cache.values()).filter(role => role.name !== '@everyone');
  }

  /**
   * Create a scheduled event in Discord
   */
  async createScheduledEvent(params: CreateDiscordEventParams): Promise<DiscordScheduledEvent> {
    if (!this.botToken || !this.guildId) {
      throw new Error('Discord configuration missing');
    }

    // Build the event payload for an EXTERNAL event type
    const payload: any = {
      name: params.name,
      privacy_level: DiscordPrivacyLevel.GUILD_ONLY,
      scheduled_start_time: params.scheduledStartTime,
      entity_type: DiscordEntityType.EXTERNAL, // External event (no voice channel)
      entity_metadata: {
        location: params.location || 'Star Citizen'
      }
    };

    // Add optional fields
    if (params.description) {
      payload.description = params.description;
    }

    if (params.scheduledEndTime) {
      payload.scheduled_end_time = params.scheduledEndTime;
    } else {
      // Default to 2 hours after start if no end time specified
      const startDate = new Date(params.scheduledStartTime);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      payload.scheduled_end_time = endDate.toISOString();
    }

    if (params.image) {
      payload.image = params.image;
    }

    logger.info('Creating Discord scheduled event', { module: 'discord', eventName: payload.name });

    const response = await fetch(
      `${DISCORD_API_BASE}/guilds/${this.guildId}/scheduled-events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${this.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Discord API error creating event', undefined, {
        module: 'discord',
        status: response.status,
        errorText,
      });
      throw new Error(`Discord API error: ${response.status} - ${errorText}`);
    }

    const event: DiscordScheduledEvent = await response.json();
    logger.info('Discord event created successfully', { module: 'discord', eventId: event.id });
    return event;
  }

  /**
   * Update a scheduled event in Discord
   */
  async updateScheduledEvent(eventId: string, params: Partial<CreateDiscordEventParams>): Promise<DiscordScheduledEvent> {
    if (!this.botToken || !this.guildId) {
      throw new Error('Discord configuration missing');
    }

    const payload: any = {};

    if (params.name) payload.name = params.name;
    if (params.description !== undefined) payload.description = params.description;
    if (params.scheduledStartTime) payload.scheduled_start_time = params.scheduledStartTime;
    if (params.scheduledEndTime) payload.scheduled_end_time = params.scheduledEndTime;
    if (params.location) {
      payload.entity_metadata = { location: params.location };
    }
    if (params.image) payload.image = params.image;

    logger.info('Updating Discord scheduled event', { module: 'discord', eventId });

    const response = await fetch(
      `${DISCORD_API_BASE}/guilds/${this.guildId}/scheduled-events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bot ${this.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Discord API error updating event', undefined, {
        module: 'discord',
        eventId,
        status: response.status,
        errorText,
      });
      throw new Error(`Discord API error: ${response.status} - ${errorText}`);
    }

    const event: DiscordScheduledEvent = await response.json();
    logger.info('Discord event updated successfully', { module: 'discord', eventId: event.id });
    return event;
  }

  /**
   * Delete a scheduled event from Discord
   */
  async deleteScheduledEvent(eventId: string): Promise<void> {
    if (!this.botToken || !this.guildId) {
      throw new Error('Discord configuration missing');
    }

    logger.info('Deleting Discord scheduled event', { module: 'discord', eventId });

    const response = await fetch(
      `${DISCORD_API_BASE}/guilds/${this.guildId}/scheduled-events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bot ${this.botToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      logger.error('Discord API error deleting event', undefined, {
        module: 'discord',
        eventId,
        status: response.status,
        errorText,
      });
      throw new Error(`Discord API error: ${response.status} - ${errorText}`);
    }

    logger.info('Discord event deleted successfully', { module: 'discord', eventId });
  }

  /**
   * Get users who have RSVP'd to a scheduled event (interested users)
   */
  async getEventUsers(eventId: string): Promise<DiscordEventUser[]> {
    if (!this.botToken || !this.guildId) {
      throw new Error('Discord configuration missing');
    }

    const users: DiscordEventUser[] = [];
    let after: string | undefined = undefined;
    const limit = 100;

    // Paginate through all users
    while (true) {
      let url = `${DISCORD_API_BASE}/guilds/${this.guildId}/scheduled-events/${eventId}/users?limit=${limit}&with_member=true`;
      if (after) {
        url += `&after=${after}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bot ${this.botToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Event not found, return empty array
          return [];
        }
        const errorText = await response.text();
        throw new Error(`Discord API error: ${response.status} - ${errorText}`);
      }

      const batch: DiscordEventUser[] = await response.json();
      users.push(...batch);

      // If we got fewer than the limit, we've reached the end
      if (batch.length < limit) {
        break;
      }

      // Set the 'after' cursor for next page
      after = batch[batch.length - 1].user_id;
    }

    return users;
  }

  /**
   * Cleanup the Discord client connection
   */
  async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.guild = null;
    }
  }

  /**
   * Check if Discord service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.botToken && this.guildId);
  }

  /**
   * Ensure a role exists by name (case-insensitive); create if missing.
   */
  async ensureRoleByName(roleName: string): Promise<Role> {
    if (!this.guild) {
      await this.initializeBot();
    }
    if (!this.guild) throw new Error('Guild not available');

    // Ensure fresh roles cache
    await this.guild.roles.fetch();

    // Try to find existing role
    const existing = this.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    if (existing) return existing;

    // Create role if not exists
    logger.info('Creating Discord role', { module: 'discord', roleName });
    const created = await this.guild.roles.create({
      name: roleName,
      reason: 'Auto-created for AydoDB synchronization'
    });
    logger.info('Created Discord role', { module: 'discord', roleName: created.name, roleId: created.id });
    return created;
  }

  /**
   * Assign a role to a guild member by Discord user ID.
   * Returns true if role was added, false if already present or member missing.
   */
  async assignRoleToMember(discordUserId: string, role: Role): Promise<{added: boolean; reason: string;}> {
    if (!this.guild) {
      await this.initializeBot();
    }
    if (!this.guild) throw new Error('Guild not available');

    try {
      const member = await this.guild.members.fetch(discordUserId);
      if (!member) {
        return { added: false, reason: 'member_not_found' };
      }
      if (member.roles.cache.has(role.id)) {
        return { added: false, reason: 'already_has_role' };
      }
      await member.roles.add(role, 'Synced to AydoDB role assignment');
      return { added: true, reason: 'added' };
    } catch (err: any) {
      if (err?.code === 10007) { // Unknown Member
        return { added: false, reason: 'member_not_found' };
      }
      throw err;
    }
  }
}

let discordServiceSingleton: DiscordService | null = null;
export function getDiscordService(): DiscordService {
  if (!discordServiceSingleton) {
    discordServiceSingleton = new DiscordService();
  }
  return discordServiceSingleton;
}