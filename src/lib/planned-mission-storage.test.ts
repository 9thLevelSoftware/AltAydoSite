import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { updatePlannedMission } from './planned-mission-storage';

type MongoUpdateOperation = {
  $set: Record<string, unknown>;
  $unset?: Record<string, ''>;
  $inc: { __v: number };
};

const mocks = vi.hoisted(() => ({
  connectToDatabase: vi.fn(),
  collection: vi.fn(),
  findOneAndUpdate: vi.fn(),
}));

vi.mock('./mongodb', () => ({
  connectToDatabase: mocks.connectToDatabase,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

function makeDbMission(id: string) {
  return {
    _id: new ObjectId(id),
    name: 'Mission',
    scheduledDateTime: '2026-06-01T20:00:00.000Z',
    operationType: 'Space Operations',
    primaryActivity: 'Mining',
    secondaryActivity: 'Escort',
    tertiaryActivity: 'Combat',
    leaders: [],
    shipRequirements: [],
    personnelRequirements: [],
    ships: [],
    objectives: '',
    briefing: '',
    images: [],
    expectedParticipants: [],
    confirmedParticipants: [],
    status: 'DRAFT',
    createdBy: 'user-1',
    createdAt: '2026-05-27T00:00:00.000Z',
    updatedAt: '2026-05-27T00:00:00.000Z',
    __v: 0,
  };
}

describe('planned mission storage updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collection.mockReturnValue({
      findOneAndUpdate: mocks.findOneAndUpdate,
    });
    mocks.connectToDatabase.mockResolvedValue({
      db: {
        collection: mocks.collection,
      },
    });
  });

  it('unsets clearable fields sent as null or undefined in MongoDB updates', async () => {
    const id = '507f1f77bcf86cd799439011';
    mocks.findOneAndUpdate.mockResolvedValueOnce({
      ...makeDbMission(id),
      secondaryActivity: undefined,
      tertiaryActivity: undefined,
      discordEvent: undefined,
    });

    const result = await updatePlannedMission(id, {
      primaryActivity: undefined,
      secondaryActivity: null,
      tertiaryActivity: undefined,
      discordEvent: undefined,
    });

    expect(result?.id).toBe(id);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledTimes(1);

    const updateOperation = mocks.findOneAndUpdate.mock.calls[0][1] as MongoUpdateOperation;
    expect(updateOperation.$unset).toEqual({
      secondaryActivity: '',
      tertiaryActivity: '',
      discordEvent: '',
    });
    expect(updateOperation.$set).toMatchObject({
      updatedAt: expect.any(String),
    });
    expect(updateOperation.$set).not.toHaveProperty('primaryActivity');
    expect(updateOperation.$set).not.toHaveProperty('secondaryActivity');
    expect(updateOperation.$set).not.toHaveProperty('tertiaryActivity');
    expect(updateOperation.$set).not.toHaveProperty('discordEvent');
  });
});
