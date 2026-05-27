import { describe, expect, it } from 'vitest';
import {
  createMissionCopyDraft,
  deriveShipRequirementsFromShips,
  getMissionShipRequirements,
  inferShipCategory,
} from './mission-requirements';
import type { MissionShip, PlannedMission } from '@/types/PlannedMission';

function makeMission(overrides: Partial<PlannedMission> = {}): PlannedMission {
  return {
    id: 'mission-123',
    name: 'Source Mission',
    scheduledDateTime: '2026-04-01T20:00:00Z',
    operationType: 'Space Operations',
    primaryActivity: 'Mining',
    leaders: [{ userId: 'u1', aydoHandle: 'LeaderOne', role: 'Mission Commander' }],
    shipRequirements: [{ size: 'Large', category: 'Industrial', count: 2 }],
    personnelRequirements: [{ profession: 'Pilot', count: 2 }],
    ships: [],
    objectives: 'Mine quantanium',
    briefing: 'Briefing text',
    equipmentNotes: 'Mining consumables',
    images: [{ id: 'img-1', url: 'https://example.com/img.png', uploadedBy: 'u1', uploadedAt: '2026-03-01T00:00:00Z' }],
    expectedParticipants: [{ discordId: 'd1', discordUsername: 'ExpectedUser' }],
    confirmedParticipants: [{ odId: 'd1', displayName: 'ExpectedUser', confirmedBy: 'u1', confirmedAt: '2026-03-01T00:00:00Z' }],
    discordEvent: {
      eventId: 'event-1',
      guildId: 'guild-1',
      createdAt: '2026-03-01T00:00:00Z',
      status: 'SCHEDULED',
    },
    status: 'SCHEDULED',
    createdBy: 'u1',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-02T00:00:00Z',
    ...overrides,
  };
}

describe('mission requirements', () => {
  it('infers ship category from legacy role and ship text', () => {
    expect(inferShipCategory({
      shipName: 'Prospector',
      manufacturer: 'MISC',
      size: 'small',
      role: ['Mining'],
      fleetyardsId: 'f1',
      quantity: 1,
    })).toBe('Industrial');

    expect(inferShipCategory({
      shipName: 'Cutlass Red',
      manufacturer: 'Drake',
      size: 'medium',
      role: ['Medical'],
      fleetyardsId: 'f2',
      quantity: 1,
    })).toBe('Medical');

    expect(inferShipCategory({
      shipName: 'Gladius',
      manufacturer: 'Aegis',
      size: 'small',
      role: ['Light Fighter'],
      fleetyardsId: 'f3',
      quantity: 1,
    })).toBe('Fighter');
  });

  it('tolerates malformed legacy ship role data during category inference', () => {
    expect(inferShipCategory({
      shipName: 'Freelancer MAX',
      manufacturer: 'MISC',
      size: 'medium',
      role: 'Cargo' as unknown as string[],
      fleetyardsId: 'f4',
      quantity: 1,
    })).toBe('Transport');
  });

  it('groups legacy ships into normalized requirement rows', () => {
    const requirements = deriveShipRequirementsFromShips([
      { shipName: 'Prospector', manufacturer: 'MISC', size: 'small', role: ['Mining'], fleetyardsId: 'f1', quantity: 2 },
      { shipName: 'MOLE', manufacturer: 'Argo', size: 'Large', role: ['Mining'], fleetyardsId: 'f2', quantity: 1 },
      { shipName: 'Prospector', manufacturer: 'MISC', size: 'Small', role: ['Mining'], fleetyardsId: 'f3', quantity: 3 },
    ]);

    expect(requirements).toEqual([
      { size: 'Small', category: 'Industrial', count: 5 },
      { size: 'Large', category: 'Industrial', count: 1 },
    ]);
  });

  it('ignores malformed legacy ship entries when deriving requirements', () => {
    const requirements = deriveShipRequirementsFromShips([
      null,
      undefined,
      'not a ship',
      { shipName: 'Prospector', manufacturer: 'MISC', size: 'small', role: ['Mining'], fleetyardsId: 'f1', quantity: 2 },
    ] as unknown as MissionShip[]);

    expect(requirements).toEqual([
      { size: 'Small', category: 'Industrial', count: 2 },
    ]);
  });

  it('prefers explicit requirements over legacy ships', () => {
    const mission = makeMission({
      shipRequirements: [{ size: 'Capital', category: 'Transport', count: 1 }],
      ships: [
        { shipName: 'Prospector', manufacturer: 'MISC', size: 'small', role: ['Mining'], fleetyardsId: 'f1', quantity: 2 },
      ],
    });

    expect(getMissionShipRequirements(mission)).toEqual([
      { size: 'Capital', category: 'Transport', count: 1 },
    ]);
  });

  it('sanitizes copied missions into new draft data', () => {
    const draft = createMissionCopyDraft(makeMission());

    expect(draft.name).toBe('Copy of Source Mission');
    expect(draft.scheduledDateTime).toBe('');
    expect(draft.status).toBe('DRAFT');
    expect(draft.shipRequirements).toEqual([{ size: 'Large', category: 'Industrial', count: 2 }]);
    expect(draft.personnelRequirements).toEqual([{ profession: 'Pilot', count: 2 }]);
    expect(draft.ships).toEqual([]);
    expect(draft.expectedParticipants).toEqual([]);
    expect(draft.confirmedParticipants).toEqual([]);
    expect(draft).not.toHaveProperty('id');
    expect(draft).not.toHaveProperty('createdBy');
    expect(draft).not.toHaveProperty('createdAt');
    expect(draft).not.toHaveProperty('updatedAt');
    expect(draft).not.toHaveProperty('discordEvent');
  });

  it('copies legacy missions by deriving ship requirements', () => {
    const draft = createMissionCopyDraft(makeMission({
      shipRequirements: [],
      ships: [
        { shipName: 'Cutlass Red', manufacturer: 'Drake', size: 'medium', role: ['Medical'], fleetyardsId: 'f1', quantity: 1 },
      ],
    }));

    expect(draft.shipRequirements).toEqual([
      { size: 'Medium', category: 'Medical', count: 1 },
    ]);
  });
});
