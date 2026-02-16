import { MissionStatus } from '@/types/Mission';

/**
 * Mission Status State Machine
 *
 * Defines valid status transitions for legacy Mission types.
 * This mirrors the pattern used in planned-missions but uses the
 * MissionStatus type (Planning, Briefing, etc.) instead of PlannedMissionStatus.
 */

/**
 * Valid transitions from each mission status.
 * - Planning: Can move to Briefing or be Cancelled
 * - Briefing: Can move to In Progress, go back to Planning, or be Cancelled
 * - In Progress: Can move to Debriefing, skip to Completed, or be Cancelled
 * - Debriefing: Can move to Completed or go back to In Progress
 * - Completed: Can only be Archived (terminal)
 * - Archived: Terminal state, no transitions
 * - Cancelled: Can be restored to Planning
 */
export const MISSION_STATUS_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  'Planning': ['Briefing', 'Cancelled'],
  'Briefing': ['In Progress', 'Planning', 'Cancelled'],
  'In Progress': ['Debriefing', 'Completed', 'Cancelled'],
  'Debriefing': ['Completed', 'In Progress'],
  'Completed': ['Archived'],
  'Archived': [],
  'Cancelled': ['Planning']
};

/**
 * Check if a status transition is valid.
 *
 * @param from - Current mission status
 * @param to - Target mission status
 * @returns true if the transition is allowed, false otherwise
 */
export function isValidMissionTransition(from: MissionStatus, to: MissionStatus): boolean {
  const allowed = MISSION_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Get the list of valid transitions from a given status.
 * Useful for building error messages.
 *
 * @param from - Current mission status
 * @returns Array of valid target statuses (may be empty for terminal states)
 */
export function getValidTransitions(from: MissionStatus): MissionStatus[] {
  return MISSION_STATUS_TRANSITIONS[from] || [];
}
