import { logger } from '@/lib/logger';
import { getDiscordRoleMonitor } from './discord-role-monitor';

// Initialize Discord Role Monitor
// This should be called when the application starts
export function initializeDiscordRoleMonitor(): void {
  // Only start in production or when explicitly enabled
  const shouldStart = process.env.NODE_ENV === 'production' ||
                     process.env.DISCORD_ROLE_MONITOR_ENABLED === 'true';

  if (!shouldStart) {
    logger.info('Discord role monitor not starting (not in production and not explicitly enabled)', {
      module: 'discord-monitor-init',
    });
    return;
  }

  // Check if Discord is configured
  const discordToken = process.env.DISCORD_BOT_TOKEN;
  const discordGuildId = process.env.DISCORD_GUILD_ID;

  if (!discordToken || !discordGuildId) {
    logger.warn('Discord role monitor not starting: DISCORD_BOT_TOKEN and DISCORD_GUILD_ID environment variables required', {
      module: 'discord-monitor-init',
    });
    return;
  }

  try {
    const monitor = getDiscordRoleMonitor();
    monitor.start();
    logger.info('Discord role monitor initialized and started', { module: 'discord-monitor-init' });
  } catch (error) {
    logger.error('Failed to initialize Discord role monitor', error instanceof Error ? error : undefined, {
      module: 'discord-monitor-init',
    });
  }
}

// Cleanup function for graceful shutdown
export function cleanupDiscordRoleMonitor(): void {
  try {
    const monitor = getDiscordRoleMonitor();
    monitor.stop();
    logger.info('Discord role monitor stopped', { module: 'discord-monitor-init' });
  } catch (error) {
    logger.error('Error stopping Discord role monitor', error instanceof Error ? error : undefined, {
      module: 'discord-monitor-init',
    });
  }
}
