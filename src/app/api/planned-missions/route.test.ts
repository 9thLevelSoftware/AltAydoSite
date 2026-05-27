import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST, PUT } from './route';

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  createPlannedMission: vi.fn(),
  getPlannedMissionById: vi.fn(),
  updatePlannedMission: vi.fn(),
  canUserModifyMission: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock('@/app/api/auth/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/planned-mission-storage', () => ({
  createPlannedMission: mocks.createPlannedMission,
  getPlannedMissionById: mocks.getPlannedMissionById,
  getAllPlannedMissionsPaginated: vi.fn(),
  updatePlannedMission: mocks.updatePlannedMission,
  deletePlannedMission: vi.fn(),
  canUserModifyMission: mocks.canUserModifyMission,
  canUserDeleteMission: vi.fn(),
}));

vi.mock('@/lib/discord', () => ({
  getDiscordService: vi.fn(() => ({
    isConfigured: () => false,
  })),
}));

vi.mock('@/lib/discord-event-description', () => ({
  buildEventDescription: vi.fn(() => 'Mission description'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const validMissionPayload = {
  name: 'Valid Mission',
  scheduledDateTime: '2026-06-01T20:00:00.000Z',
  operationType: 'Ground Operations',
  primaryActivity: 'Mining',
};

function makeRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/planned-missions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function makePutRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/planned-missions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('planned missions POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        clearanceLevel: 3,
      },
    });
    mocks.createPlannedMission.mockImplementation(async (mission) => ({
      ...mission,
      id: 'created-mission',
      createdAt: '2026-05-27T00:00:00.000Z',
      updatedAt: '2026-05-27T00:00:00.000Z',
    }));
    mocks.canUserModifyMission.mockResolvedValue(true);
    mocks.getPlannedMissionById.mockResolvedValue({
      id: 'mission-1',
      status: 'DRAFT',
    });
    mocks.updatePlannedMission.mockImplementation(async (_id, mission) => ({
      ...mission,
      id: 'mission-1',
    }));
  });

  it('returns a validation error instead of throwing for malformed ship requirement entries', async () => {
    const response = await POST(makeRequest({
      ...validMissionPayload,
      shipRequirements: [null],
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid ship requirements data' });
    expect(mocks.createPlannedMission).not.toHaveBeenCalled();
  });

  it('returns a validation error instead of throwing for malformed personnel requirement entries', async () => {
    const response = await POST(makeRequest({
      ...validMissionPayload,
      personnelRequirements: ['not a requirement'],
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid personnel requirements data' });
    expect(mocks.createPlannedMission).not.toHaveBeenCalled();
  });

  it('does not pass client-supplied read-only fields into mission creation', async () => {
    const response = await POST(makeRequest({
      ...validMissionPayload,
      id: 'client-id',
      _id: 'client-mongo-id',
      createdBy: 'attacker',
      createdAt: '2000-01-01T00:00:00.000Z',
      updatedAt: '2000-01-01T00:00:00.000Z',
      shipRequirements: [{ size: 'Small', category: 'Transport', count: 1 }],
      personnelRequirements: [{ profession: 'Pilot', count: 1 }],
    }));

    expect(response.status).toBe(201);
    expect(mocks.createPlannedMission).toHaveBeenCalledTimes(1);

    const createdMission = mocks.createPlannedMission.mock.calls[0][0];
    expect(createdMission.id).toBeUndefined();
    expect(createdMission._id).toBeUndefined();
    expect(createdMission.createdAt).toBeUndefined();
    expect(createdMission.updatedAt).toBeUndefined();
    expect(createdMission.createdBy).toBe('user-1');
  });

  it('validates ship requirements on requirement-only PUT updates', async () => {
    const response = await PUT(makePutRequest({
      id: 'mission-1',
      shipRequirements: [{ size: 'Invalid', category: 'Transport', count: 1 }],
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid ship requirements data' });
    expect(mocks.updatePlannedMission).not.toHaveBeenCalled();
  });

  it('validates personnel requirements on requirement-only PUT updates', async () => {
    const response = await PUT(makePutRequest({
      id: 'mission-1',
      personnelRequirements: [{ profession: 'Pilot', count: 99 }],
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid personnel requirements data' });
    expect(mocks.updatePlannedMission).not.toHaveBeenCalled();
  });
});
