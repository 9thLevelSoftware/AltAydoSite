import { PlannedMission } from '@/types/PlannedMission';
import {
  getMissionPersonnelRequirements,
  getMissionShipRequirements
} from '@/lib/mission-requirements';

const DISCORD_MAX_LENGTH = 1000;

/**
 * Build a Discord scheduled event description from mission data.
 * Assembles all meaningful fields and gracefully truncates to fit
 * Discord's 1000-character limit.
 */
export function buildEventDescription(mission: PlannedMission, baseUrl?: string): string {
  const sections = buildSections(mission, baseUrl);
  const raw = sections.join('\n\n');

  if (raw.length <= DISCORD_MAX_LENGTH) {
    return raw;
  }

  return truncateToDiscordLimit(sections, DISCORD_MAX_LENGTH);
}

/** Assemble ordered description sections from mission data. */
function buildSections(mission: PlannedMission, baseUrl?: string): string[] {
  const sections: string[] = [];

  // 1. Objectives
  if (mission.objectives) {
    sections.push(`**Objectives:**\n${mission.objectives}`);
  }

  // 2. Type + Activities
  const activities = [mission.primaryActivity];
  if (mission.secondaryActivity) activities.push(mission.secondaryActivity);
  if (mission.tertiaryActivity) activities.push(mission.tertiaryActivity);
  sections.push(`**Type:** ${mission.operationType}`);
  sections.push(`**Activities:** ${activities.join(', ')}`);

  // 3. Leadership
  if (mission.leaders && mission.leaders.length > 0) {
    const leaderList = mission.leaders
      .map(l => `${l.role}: ${l.aydoHandle}`)
      .join('\n');
    sections.push(`**Leadership:**\n${leaderList}`);
  }

  // 4. Requirements
  const shipRequirements = getMissionShipRequirements(mission);
  if (shipRequirements.length > 0) {
    const shipLines = shipRequirements.map(requirement =>
      `${requirement.count}x ${requirement.size} ${requirement.category}`
    );
    sections.push(`**Ship Requirements:**\n${shipLines.join('\n')}`);
  }

  const personnelRequirements = getMissionPersonnelRequirements(mission);
  if (personnelRequirements.length > 0) {
    const personnelLines = personnelRequirements.map(requirement =>
      `${requirement.count}x ${requirement.profession}`
    );
    sections.push(`**Personnel Requirements:**\n${personnelLines.join('\n')}`);
  }

  // 5. Equipment Notes
  if (mission.equipmentNotes) {
    sections.push(`**Equipment:**\n${mission.equipmentNotes}`);
  }

  // 6. Briefing (truncated preview)
  if (mission.briefing) {
    const maxBriefing = 200;
    const briefingText = mission.briefing.length > maxBriefing
      ? mission.briefing.slice(0, maxBriefing) + '...'
      : mission.briefing;
    sections.push(`**Briefing:**\n${briefingText}`);
  }

  // 7. Full Briefing link (always last)
  if (baseUrl) {
    sections.push(`📋 **Full Briefing:** ${baseUrl}/dashboard/mission-planner?missionId=${mission.id}`);
  }

  return sections;
}

/**
 * Progressively truncate sections to fit within maxLength.
 * Drops from the bottom up: briefing -> equipment -> personnel -> ship list overflow.
 * Always preserves: objectives, type/activities, leadership, and briefing link.
 */
function truncateToDiscordLimit(sections: string[], maxLength: number): string {
  // Work with a mutable copy
  let current = [...sections];

  // Helper to join and measure
  const measure = (s: string[]) => s.join('\n\n').length;

  // Step 1: Drop briefing section
  if (measure(current) > maxLength) {
    current = current.filter(s => !s.startsWith('**Briefing:**'));
  }

  // Step 2: Drop equipment section
  if (measure(current) > maxLength) {
    current = current.filter(s => !s.startsWith('**Equipment:**'));
  }

  // Step 3: Drop personnel requirements
  if (measure(current) > maxLength) {
    current = current.filter(s => !s.startsWith('**Personnel Requirements:**'));
  }

  // Step 4: Cap ship requirements to 5 rows + "and X more..."
  if (measure(current) > maxLength) {
    const shipIdx = current.findIndex(s => s.startsWith('**Ship Requirements:**'));
    if (shipIdx !== -1) {
      const shipSection = current[shipIdx];
      const lines = shipSection.split('\n');
      const header = lines[0];
      const shipLines = lines.slice(1);
      if (shipLines.length > 5) {
        const remaining = shipLines.length - 5;
        current[shipIdx] = `${header}\n${shipLines.slice(0, 5).join('\n')}\nand ${remaining} more...`;
      }
    }
  }

  // Step 5: If still over, drop ship requirements entirely
  if (measure(current) > maxLength) {
    current = current.filter(s => !s.startsWith('**Ship Requirements:**'));
  }

  // Step 6: Hard truncate as last resort
  let result = current.join('\n\n');
  if (result.length > maxLength) {
    result = result.slice(0, maxLength - 3) + '...';
  }

  return result;
}
