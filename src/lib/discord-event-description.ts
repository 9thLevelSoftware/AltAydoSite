import { PlannedMission } from '@/types/PlannedMission';

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

  // 4. Ship Roster
  if (mission.ships && mission.ships.length > 0) {
    const shipLines = mission.ships.map(s => {
      let line = `${s.quantity}x ${s.shipName}`;
      if (s.assignedToName) {
        line += ` (${s.assignedToName})`;
      }
      return line;
    });
    sections.push(`**Ships:**\n${shipLines.join('\n')}`);
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
 * Drops from the bottom up: briefing → equipment → ship list overflow.
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

  // Step 3: Cap ship list to 5 ships + "and X more..."
  if (measure(current) > maxLength) {
    const shipIdx = current.findIndex(s => s.startsWith('**Ships:**'));
    if (shipIdx !== -1) {
      const shipSection = current[shipIdx];
      const lines = shipSection.split('\n');
      const header = lines[0]; // "**Ships:**"
      const shipLines = lines.slice(1);
      if (shipLines.length > 5) {
        const remaining = shipLines.length - 5;
        current[shipIdx] = `${header}\n${shipLines.slice(0, 5).join('\n')}\nand ${remaining} more...`;
      }
    }
  }

  // Step 4: If still over, drop ships entirely
  if (measure(current) > maxLength) {
    current = current.filter(s => !s.startsWith('**Ships:**'));
  }

  // Step 5: Hard truncate as last resort (keep link at bottom)
  let result = current.join('\n\n');
  if (result.length > maxLength) {
    result = result.slice(0, maxLength - 3) + '...';
  }

  return result;
}
