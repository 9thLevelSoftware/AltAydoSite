import { logger } from '@/lib/logger';
import { getDiscordService } from './discord';
import { ROLE_MAPPINGS, getDivisionFromPosition, getHighestClearanceLevel, POSITIONS_WITH_CLEARANCE } from './discord-role-mappings';
import * as userStorage from './user-storage';
import { User } from '@/types/user';

export interface UserRoleUpdate {
  userId: string;
  discordName: string;
  division?: string;
  payGrade?: string;
  position?: string;
  clearanceLevel: number;
  rolesFound: string[];
  updated: boolean;
  error?: string;
}

export class DiscordRoleMonitor {
  private discordService = getDiscordService();
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the role monitoring service with 10-minute intervals
   */
  start(): void {
    if (this.isRunning) {
      logger.info('Discord role monitor is already running', { module: 'discord-monitor' });
      return;
    }

    logger.info('Starting Discord role monitor', { module: 'discord-monitor' });
    this.isRunning = true;

    // Run immediately, then every 10 minutes
    this.checkAllUserRoles();
    this.intervalId = setInterval(() => {
      this.checkAllUserRoles();
    }, 10 * 60 * 1000); // 10 minutes

    logger.info('Discord role monitor started', { module: 'discord-monitor', intervalMinutes: 10 });
  }

  /**
   * Stop the role monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping Discord role monitor', { module: 'discord-monitor' });
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Cleanup Discord client
    this.discordService.cleanup();
    logger.info('Discord role monitor stopped', { module: 'discord-monitor' });
  }

  /**
   * Check roles for all users with Discord names
   */
  async checkAllUserRoles(): Promise<UserRoleUpdate[]> {
    logger.info('Starting Discord role check cycle', { module: 'discord-monitor' });

    try {
      // Get all users from database
      const allUsers = await userStorage.getAllUsers();
      const usersWithDiscord = allUsers.filter(user => user.discordName);

      logger.info('Found users with Discord names', {
        module: 'discord-monitor',
        usersWithDiscord: usersWithDiscord.length,
        totalUsers: allUsers.length,
      });

      if (usersWithDiscord.length === 0) {
        logger.info('No users with Discord names found', { module: 'discord-monitor' });
        return [];
      }

      const results: UserRoleUpdate[] = [];

      // Process each user
      for (const user of usersWithDiscord) {
        try {
          const result = await this.checkUserRoles(user);
          results.push(result);
        } catch (error) {
          logger.error('Error checking roles for user', error instanceof Error ? error : undefined, {
            module: 'discord-monitor',
            aydoHandle: user.aydoHandle,
            discordName: user.discordName,
          });
          results.push({
            userId: user.id,
            discordName: user.discordName!,
            clearanceLevel: user.clearanceLevel || 1,
            rolesFound: [],
            updated: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const updatedCount = results.filter(r => r.updated).length;
      const errorCount = results.filter(r => r.error).length;

      logger.info('Role check cycle complete', {
        module: 'discord-monitor',
        processed: results.length,
        updated: updatedCount,
        errors: errorCount,
      });

      return results;

    } catch (error) {
      logger.error('Error in checkAllUserRoles', error instanceof Error ? error : undefined, {
        module: 'discord-monitor',
      });
      return [];
    }
  }

  /**
   * Check roles for a specific user
   */
  async checkUserRoles(user: User): Promise<UserRoleUpdate> {
    logger.info('Checking roles for user', {
      module: 'discord-monitor',
      aydoHandle: user.aydoHandle,
      discordName: user.discordName,
    });

    if (!user.discordName) {
      throw new Error('User has no Discord name');
    }

    // Get Discord member
    const member = await this.discordService.getMemberByName(user.discordName);
    if (!member) {
      throw new Error(`Discord member not found: ${user.discordName}`);
    }

    // Get member's roles
    const memberRoles = await this.discordService.getMemberRoles(member);
    const roleNames = memberRoles.map(role => role.name);

    logger.info('Found Discord roles for user', {
      module: 'discord-monitor',
      discordName: user.discordName,
      roleCount: roleNames.length,
      roles: roleNames,
    });

    // Map roles to organizational data
    const mappedData = this.mapRolesToOrganizationalData(roleNames);

    // Check if user data needs updating
    const needsUpdate = this.doesUserNeedUpdate(user, mappedData);

    let updated = false;
    if (needsUpdate) {
      // Update user in database
      const updateData: Partial<User> = {
        updatedAt: new Date().toISOString()
      };

      if (mappedData.division !== undefined) updateData.division = mappedData.division;
      if (mappedData.payGrade !== undefined) updateData.payGrade = mappedData.payGrade;
      if (mappedData.position !== undefined) updateData.position = mappedData.position;
      if (mappedData.clearanceLevel !== undefined) updateData.clearanceLevel = mappedData.clearanceLevel;

      const updatedUser = await userStorage.updateUser(user.id, updateData);
      updated = !!updatedUser;

      if (updated) {
        logger.info('Updated user from Discord roles', {
          module: 'discord-monitor',
          aydoHandle: user.aydoHandle,
          division: mappedData.division,
          payGrade: mappedData.payGrade,
          position: mappedData.position,
          clearanceLevel: mappedData.clearanceLevel,
        });
      } else {
        logger.error('Failed to update user from Discord roles', undefined, {
          module: 'discord-monitor',
          aydoHandle: user.aydoHandle,
        });
      }
    } else {
      logger.info('No updates needed for user', {
        module: 'discord-monitor',
        aydoHandle: user.aydoHandle,
      });
    }

    return {
      userId: user.id,
      discordName: user.discordName,
      division: mappedData.division,
      payGrade: mappedData.payGrade,
      position: mappedData.position,
      clearanceLevel: mappedData.clearanceLevel || user.clearanceLevel || 1,
      rolesFound: roleNames,
      updated
    };
  }

  /**
   * Map Discord roles to organizational data
   */
  private mapRolesToOrganizationalData(roleNames: string[]): {
    division?: string;
    payGrade?: string;
    position?: string;
    clearanceLevel?: number;
  } {
    let division: string | undefined;
    let payGrade: string | undefined;
    let position: string | undefined;
    const positions: string[] = [];

    // Process each role
    for (const roleName of roleNames) {
      const mapping = ROLE_MAPPINGS.find(m => m.discordRoleName === roleName);
      
      if (mapping) {
        if (mapping.division) {
          division = mapping.division;
        }
        if (mapping.payGrade) {
          payGrade = mapping.payGrade;
        }
        if (mapping.position) {
          position = mapping.position;
          positions.push(roleName);
          // Set division from position if not already set
          if (!division && mapping.division) {
            division = mapping.division;
          }
        }
      }
    }

    // If we have position roles but no division role, try to infer division from position
    if (!division && positions.length > 0) {
      for (const positionRole of positions) {
        const inferredDivision = getDivisionFromPosition(positionRole);
        if (inferredDivision) {
          division = inferredDivision;
          break;
        }
      }
    }

    // Determine clearance level from positions
    let clearanceLevel: number | undefined;
    if (positions.length > 0) {
      clearanceLevel = getHighestClearanceLevel(positions);
    }

    return {
      division,
      payGrade,
      position,
      clearanceLevel
    };
  }

  /**
   * Check if user data needs updating
   */
  private doesUserNeedUpdate(user: User, mappedData: {
    division?: string;
    payGrade?: string;
    position?: string;
    clearanceLevel?: number;
  }): boolean {
    // Check if any of the mapped values differ from current user data
    if (mappedData.division !== undefined && user.division !== mappedData.division) return true;
    if (mappedData.payGrade !== undefined && user.payGrade !== mappedData.payGrade) return true;
    if (mappedData.position !== undefined && user.position !== mappedData.position) return true;
    if (mappedData.clearanceLevel !== undefined && user.clearanceLevel !== mappedData.clearanceLevel) return true;

    return false;
  }

  /**
   * Get the current status of the monitor
   */
  getStatus(): { isRunning: boolean; nextCheck?: Date } {
    return {
      isRunning: this.isRunning,
      nextCheck: this.intervalId ? new Date(Date.now() + 10 * 60 * 1000) : undefined
    };
  }
}

// Global instance
let discordRoleMonitorInstance: DiscordRoleMonitor | null = null;

export function getDiscordRoleMonitor(): DiscordRoleMonitor {
  if (!discordRoleMonitorInstance) {
    discordRoleMonitorInstance = new DiscordRoleMonitor();
  }
  return discordRoleMonitorInstance;
}
