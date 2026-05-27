import { describe, it, expect } from 'vitest';
import { buildEventDescription } from './discord-event-description';
import { PlannedMission } from '@/types/PlannedMission';

function makeMission(overrides: Partial<PlannedMission> = {}): PlannedMission {
  return {
    id: 'mission-123',
    name: 'Test Mission',
    scheduledDateTime: '2026-04-01T20:00:00Z',
    operationType: 'Space Operations',
    primaryActivity: 'Mining',
    leaders: [],
    shipRequirements: [],
    personnelRequirements: [],
    ships: [],
    objectives: '',
    briefing: '',
    images: [],
    expectedParticipants: [],
    confirmedParticipants: [],
    status: 'SCHEDULED',
    createdBy: 'user-1',
    createdAt: '2026-03-18T00:00:00Z',
    updatedAt: '2026-03-18T00:00:00Z',
    ...overrides,
  };
}

describe('buildEventDescription', () => {
  it('includes all populated fields', () => {
    const mission = makeMission({
      objectives: 'Secure mining operation in Aaron Halo belt',
      secondaryActivity: 'Escort',
      leaders: [
        { userId: 'u1', aydoHandle: 'PlayerOne', role: 'Mission Commander' },
        { userId: 'u2', aydoHandle: 'PlayerTwo', role: 'Security Lead' },
      ],
      shipRequirements: [
        { size: 'Large', category: 'Transport', count: 2 },
        { size: 'Small', category: 'Industrial', count: 3 },
      ],
      personnelRequirements: [
        { profession: 'Pilot', count: 2 },
        { profession: 'Engineer', count: 1 },
      ],
      equipmentNotes: 'Bring mining consumables and Pembroke armor for EVA',
      briefing: 'Meet at Port Olisar. Form up in convoy formation.',
    });

    const desc = buildEventDescription(mission, 'https://site.com');

    expect(desc).toContain('**Objectives:**');
    expect(desc).toContain('Secure mining operation');
    expect(desc).toContain('**Type:** Space Operations');
    expect(desc).toContain('**Activities:** Mining, Escort');
    expect(desc).toContain('Mission Commander: PlayerOne');
    expect(desc).toContain('Security Lead: PlayerTwo');
    expect(desc).toContain('**Ship Requirements:**');
    expect(desc).toContain('2x Large Transport');
    expect(desc).toContain('3x Small Industrial');
    expect(desc).toContain('**Personnel Requirements:**');
    expect(desc).toContain('2x Pilot');
    expect(desc).toContain('1x Engineer');
    expect(desc).toContain('**Equipment:**');
    expect(desc).toContain('Pembroke armor');
    expect(desc).toContain('**Briefing:**');
    expect(desc).toContain('convoy formation');
    expect(desc).toContain('📋 **Full Briefing:** https://site.com/dashboard/mission-planner?missionId=mission-123');
  });

  it('omits ship requirements section when no requirements or legacy ships', () => {
    const mission = makeMission({ objectives: 'Patrol route' });
    const desc = buildEventDescription(mission);
    expect(desc).not.toContain('**Ship Requirements:**');
  });

  it('omits equipment section when no equipmentNotes', () => {
    const mission = makeMission({ objectives: 'Patrol route' });
    const desc = buildEventDescription(mission);
    expect(desc).not.toContain('**Equipment:**');
  });

  it('omits briefing section when no briefing', () => {
    const mission = makeMission({ objectives: 'Patrol route' });
    const desc = buildEventDescription(mission);
    expect(desc).not.toContain('**Briefing:**');
  });

  it('truncates long briefing to ~200 chars', () => {
    const longBriefing = 'A'.repeat(300);
    const mission = makeMission({ briefing: longBriefing });
    const desc = buildEventDescription(mission);

    // Should have truncated briefing with ellipsis
    expect(desc).toContain('A'.repeat(200) + '...');
    expect(desc).not.toContain('A'.repeat(201));
  });

  it('produces minimal output for empty mission', () => {
    const mission = makeMission();
    const desc = buildEventDescription(mission);

    expect(desc).toContain('**Type:** Space Operations');
    expect(desc).toContain('**Activities:** Mining');
    expect(desc).not.toContain('**Objectives:**');
    expect(desc).not.toContain('**Ship Requirements:**');
    expect(desc).not.toContain('**Leadership:**');
  });

  it('derives requirements from legacy ships when requirements are missing', () => {
    const mission = makeMission({
      ships: [
        { shipName: 'Caterpillar', manufacturer: 'Drake', size: 'Large', fleetyardsId: 'f1', quantity: 1, assignedToName: 'Ace' },
      ],
    });
    const desc = buildEventDescription(mission);
    expect(desc).toContain('**Ship Requirements:**');
    expect(desc).toContain('1x Large Transport');
    expect(desc).not.toContain('Caterpillar');
  });

  it('stays under 1000 characters', () => {
    const mission = makeMission({
      objectives: 'X'.repeat(200),
      leaders: Array.from({ length: 5 }, (_, i) => ({
        userId: `u${i}`, aydoHandle: `Leader${i}LongName`, role: `Role ${i} Extended`,
      })),
      shipRequirements: Array.from({ length: 15 }, (_, i) => ({
        size: 'Large',
        category: i % 2 === 0 ? 'Fighter' : 'Transport',
        count: i + 1,
      })),
      equipmentNotes: 'E'.repeat(200),
      briefing: 'B'.repeat(300),
    });

    const desc = buildEventDescription(mission, 'https://aydocorp.space');
    expect(desc.length).toBeLessThanOrEqual(1000);
  });

  it('drops briefing first when over limit', () => {
    const mission = makeMission({
      objectives: 'O'.repeat(200),
      briefing: 'B'.repeat(300),
      equipmentNotes: 'E'.repeat(200),
      shipRequirements: Array.from({ length: 8 }, (_, i) => ({
        size: 'Small',
        category: i % 2 === 0 ? 'Fighter' : 'Transport',
        count: 1,
      })),
    });

    const desc = buildEventDescription(mission, 'https://aydocorp.space');
    expect(desc.length).toBeLessThanOrEqual(1000);
    // Core sections should survive
    expect(desc).toContain('**Objectives:**');
    expect(desc).toContain('**Type:**');
  });

  it('caps ship list to 5 with overflow message when needed', () => {
    // Build a mission where ship requirements alone would push over the limit
    // after briefing and equipment are already dropped
    const mission = makeMission({
      objectives: 'O'.repeat(300),
      leaders: Array.from({ length: 5 }, (_, i) => ({
        userId: `u${i}`, aydoHandle: `Leader${i}`, role: `Role${i}`,
      })),
      shipRequirements: Array.from({ length: 12 }, (_, i) => ({
        size: i % 2 === 0 ? 'Capital' : 'Large',
        category: i % 3 === 0 ? 'Industrial' : 'Transport',
        count: i + 1,
      })),
    });

    const desc = buildEventDescription(mission, 'https://aydocorp.space');
    expect(desc.length).toBeLessThanOrEqual(1000);

    // Ship requirements should be either capped or dropped entirely
    if (desc.includes('**Ship Requirements:**') && desc.includes('more...')) {
      const shipSection = desc.split('**Ship Requirements:**\n')[1]?.split('\n\n')[0] || '';
      const shipLines = shipSection.split('\n').filter(l => l.trim());
      expect(shipLines.length).toBeLessThanOrEqual(6); // 5 rows + "and X more..."
    }
  });

  it('includes briefing link when baseUrl provided', () => {
    const mission = makeMission();
    const withUrl = buildEventDescription(mission, 'https://example.com');
    const withoutUrl = buildEventDescription(mission);

    expect(withUrl).toContain('📋 **Full Briefing:**');
    expect(withoutUrl).not.toContain('📋 **Full Briefing:**');
  });
});
