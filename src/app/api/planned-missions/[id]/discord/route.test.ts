import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { DiscordEventStatus } from '@/types/DiscordEvent';
import { GET, PATCH } from './route';

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getPlannedMissionById: vi.fn(),
  canUserModifyMission: vi.fn(),
  updatePlannedMission: vi.fn(),
  getDiscordService: vi.fn(),
  getEventUsers: vi.fn(),
  getScheduledEvent: vi.fn(),
  updateScheduledEvent: vi.fn(),
  buildEventDescription: vi.fn(),
  getDiscordEventImageForMission: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock('@/app/api/auth/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/planned-mission-storage', () => ({
  getPlannedMissionById: mocks.getPlannedMissionById,
  canUserModifyMission: mocks.canUserModifyMission,
  updatePlannedMission: mocks.updatePlannedMission,
}));

vi.mock('@/lib/discord', () => ({
  getDiscordService: mocks.getDiscordService,
}));

vi.mock('@/lib/discord-event-description', () => ({
  buildEventDescription: mocks.buildEventDescription,
}));

vi.mock('@/lib/discord-event-image', () => ({
  getDiscordEventImageForMission: mocks.getDiscordEventImageForMission,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

function makePatchRequest(): NextRequest {
  return new Request('http://localhost/api/planned-missions/mission-1/discord', {
    method: 'PATCH',
    headers: { origin: 'http://localhost' },
  }) as NextRequest;
}

function makeGetRequest(): NextRequest {
  return new Request('http://localhost/api/planned-missions/mission-1/discord', {
    method: 'GET',
  }) as NextRequest;
}

function makeMission(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mission-1',
    name: 'Updated Mission',
    scheduledDateTime: '2026-06-01T20:00:00.000Z',
    duration: 180,
    location: 'Area18',
    status: 'SCHEDULED',
    discordEvent: {
      eventId: 'discord-event-1',
      guildId: 'guild-1',
      createdAt: '2026-05-01T00:00:00.000Z',
      status: 'SCHEDULED',
    },
    ...overrides,
  };
}

function makeParams() {
  return { params: Promise.resolve({ id: 'mission-1' }) };
}

describe('planned mission Discord PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.canUserModifyMission.mockResolvedValue(true);
    mocks.getPlannedMissionById.mockResolvedValue(makeMission());
    mocks.getDiscordService.mockReturnValue({
      isConfigured: () => true,
      getEventUsers: mocks.getEventUsers,
      getScheduledEvent: mocks.getScheduledEvent,
      updateScheduledEvent: mocks.updateScheduledEvent,
    });
    mocks.getEventUsers.mockResolvedValue([]);
    mocks.getScheduledEvent.mockResolvedValue({
      id: 'discord-event-1',
      guild_id: 'guild-1',
      name: 'Old Discord Event',
      status: DiscordEventStatus.SCHEDULED,
    });
    mocks.updateScheduledEvent.mockResolvedValue({
      id: 'discord-event-1',
      name: 'Updated Mission',
    });
    mocks.buildEventDescription.mockReturnValue('Updated Discord description');
    mocks.getDiscordEventImageForMission.mockResolvedValue('data:image/jpeg;base64,banner');
  });

  it('omits scheduledStartTime when updating an active Discord event', async () => {
    mocks.getScheduledEvent.mockResolvedValueOnce({
      id: 'discord-event-1',
      guild_id: 'guild-1',
      name: 'Old Discord Event',
      status: DiscordEventStatus.ACTIVE,
    });

    const response = await PATCH(makePatchRequest(), makeParams());

    expect(response.status).toBe(200);
    expect(mocks.updateScheduledEvent).toHaveBeenCalledTimes(1);

    const [, updateParams] = mocks.updateScheduledEvent.mock.calls[0];
    expect(updateParams).toMatchObject({
      name: 'Updated Mission',
      description: 'Updated Discord description',
      scheduledEndTime: '2026-06-01T23:00:00.000Z',
      location: 'Area18',
      image: 'data:image/jpeg;base64,banner',
    });
    expect(updateParams).not.toHaveProperty('scheduledStartTime');
  });

  it('includes scheduledStartTime for a still-scheduled Discord event', async () => {
    const response = await PATCH(makePatchRequest(), makeParams());

    expect(response.status).toBe(200);

    const [, updateParams] = mocks.updateScheduledEvent.mock.calls[0];
    expect(updateParams).toMatchObject({
      scheduledStartTime: '2026-06-01T20:00:00.000Z',
      scheduledEndTime: '2026-06-01T23:00:00.000Z',
      image: 'data:image/jpeg;base64,banner',
    });
  });

  it('omits image when activity banner resolution fails', async () => {
    mocks.getDiscordEventImageForMission.mockResolvedValueOnce(undefined);

    const response = await PATCH(makePatchRequest(), makeParams());

    expect(response.status).toBe(200);

    const [, updateParams] = mocks.updateScheduledEvent.mock.calls[0];
    expect(updateParams).not.toHaveProperty('image');
  });

  it('uses the default Discord duration when mission duration is cleared', async () => {
    mocks.getPlannedMissionById.mockResolvedValueOnce(makeMission({ duration: undefined }));

    const response = await PATCH(makePatchRequest(), makeParams());

    expect(response.status).toBe(200);

    const [, updateParams] = mocks.updateScheduledEvent.mock.calls[0];
    expect(updateParams).toMatchObject({
      scheduledEndTime: '2026-06-01T22:00:00.000Z',
    });
  });

  it('uses a safe fallback end time and omits invalid start time when the stored mission date is invalid', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    try {
      mocks.getPlannedMissionById.mockResolvedValueOnce(
        makeMission({ scheduledDateTime: 'not-a-date', duration: 180 })
      );

      const response = await PATCH(makePatchRequest(), makeParams());

      expect(response.status).toBe(200);
      const [, updateParams] = mocks.updateScheduledEvent.mock.calls[0];
      expect(updateParams).toMatchObject({
        scheduledEndTime: '2026-06-01T02:00:00.000Z',
      });
      expect(updateParams).not.toHaveProperty('scheduledStartTime');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not PATCH terminal Discord events', async () => {
    mocks.getScheduledEvent.mockResolvedValueOnce({
      id: 'discord-event-1',
      guild_id: 'guild-1',
      name: 'Old Discord Event',
      status: DiscordEventStatus.COMPLETED,
    });

    const response = await PATCH(makePatchRequest(), makeParams());

    expect(response.status).toBe(409);
    expect(mocks.updateScheduledEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when the stored Discord event is missing an event ID', async () => {
    mocks.getPlannedMissionById.mockResolvedValueOnce(
      makeMission({
        discordEvent: {
          guildId: 'guild-1',
          createdAt: '2026-05-01T00:00:00.000Z',
          status: 'SCHEDULED',
        },
      })
    );

    const response = await PATCH(makePatchRequest(), makeParams());

    expect(response.status).toBe(400);
    expect(mocks.getScheduledEvent).not.toHaveBeenCalled();
    expect(mocks.updateScheduledEvent).not.toHaveBeenCalled();
  });

  it('allows level 4 users to PATCH Discord events even when they are not mission-specific modifiers', async () => {
    mocks.getServerSession.mockResolvedValueOnce({
      user: {
        id: 'director-1',
        clearanceLevel: 4,
      },
    });
    mocks.canUserModifyMission.mockResolvedValueOnce(false);

    const response = await PATCH(makePatchRequest(), makeParams());

    expect(response.status).toBe(200);
    expect(mocks.updateScheduledEvent).toHaveBeenCalledTimes(1);
  });
});

describe('planned mission Discord GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.getPlannedMissionById.mockResolvedValue(makeMission());
    mocks.getDiscordService.mockReturnValue({
      isConfigured: () => true,
      getEventUsers: mocks.getEventUsers,
      getScheduledEvent: mocks.getScheduledEvent,
      updateScheduledEvent: mocks.updateScheduledEvent,
    });
    mocks.getEventUsers.mockResolvedValue([
      {
        user: {
          id: 'discord-user-1',
          username: 'PilotOne',
          global_name: 'Pilot One',
          avatar: null,
        },
        member: {
          nick: 'P1',
        },
      },
    ]);
    mocks.getScheduledEvent.mockResolvedValue({
      id: 'discord-event-1',
      guild_id: 'guild-1',
      name: 'Old Discord Event',
      status: DiscordEventStatus.SCHEDULED,
      user_count: 1,
    });
  });

  it('returns RSVP data when Discord is available', async () => {
    const response = await GET(makeGetRequest(), makeParams());

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject({
      count: 1,
      discordUserCount: 1,
      rsvps: [
        {
          discordId: 'discord-user-1',
          username: 'PilotOne',
          globalName: 'Pilot One',
          nickname: 'P1',
        },
      ],
    });
    expect(data.discordAvailable).toBeUndefined();
  });

  it('returns a non-failing unavailable payload when Discord is not configured', async () => {
    mocks.getDiscordService.mockReturnValueOnce({
      isConfigured: () => false,
      getEventUsers: mocks.getEventUsers,
      getScheduledEvent: mocks.getScheduledEvent,
      updateScheduledEvent: mocks.updateScheduledEvent,
    });

    const response = await GET(makeGetRequest(), makeParams());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      count: 0,
      discordUserCount: 0,
      missionStatus: 'SCHEDULED',
      statusSynced: false,
      discordAvailable: false,
      discordError: 'Discord is not configured',
    });
    expect(mocks.getEventUsers).not.toHaveBeenCalled();
  });

  it('returns a non-failing unavailable payload when Discord RSVP fetch throws', async () => {
    mocks.getEventUsers.mockRejectedValueOnce(new Error('Discord API error: 403 - missing access'));

    const response = await GET(makeGetRequest(), makeParams());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      count: 0,
      discordUserCount: 0,
      missionStatus: 'SCHEDULED',
      statusSynced: false,
      discordAvailable: false,
      discordError: 'Discord RSVP data is temporarily unavailable',
    });
  });

  it('returns a non-failing unavailable payload when the linked Discord event no longer exists', async () => {
    mocks.getEventUsers.mockResolvedValueOnce([]);
    mocks.getScheduledEvent.mockResolvedValueOnce(null);

    const response = await GET(makeGetRequest(), makeParams());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      count: 0,
      discordUserCount: 0,
      missionStatus: 'SCHEDULED',
      statusSynced: false,
      discordAvailable: false,
      discordError: 'Discord event was not found',
    });
  });
});
