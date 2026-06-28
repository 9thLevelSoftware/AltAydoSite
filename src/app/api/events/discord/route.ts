import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/auth';
import { getDiscordService } from '@/lib/discord';
import { mapDiscordEventsToEventData, mapDiscordEventToEventData } from '@/lib/eventMapper';
import * as userStorage from '@/lib/user-storage';
import { DiscordScheduledEvent } from '@/types/DiscordEvent';
import type { Session } from 'next-auth';
import { logger } from '@/lib/logger';

// Ensure Node.js runtime (discord.js compatibility if needed elsewhere)
export const runtime = 'nodejs';

// Discord snowflake IDs are 17-20 digit numeric strings
const SNOWFLAKE_REGEX = /^\d{17,20}$/;

// Cap recurrence expansion horizon to keep response sizes (and work) bounded
const MAX_HORIZON_DAYS = 90;
const DEFAULT_HORIZON_DAYS = 90;
const MIN_HORIZON_DAYS = 7;

async function resolveUserTimezone(session: Session | null): Promise<string> {
  try {
    if (session?.user?.id) {
      const user = await userStorage.getUserById(session.user.id);
      if (user?.timezone) return user.timezone;
    }
  } catch (e) {
    logger.warn('Timezone lookup failed, defaulting to UTC', {
      route: '/api/events/discord',
      error: e instanceof Error ? e.message : String(e),
    });
  }
  return 'UTC';
}

function buildSuccessResponse(params: {
  events: any[];
  source: string;
  userTimezone: string;
  recurrenceExpanded: boolean;
  recurrenceHorizonDays?: number;
}) {
  const { events, source, userTimezone, recurrenceExpanded, recurrenceHorizonDays } = params;
  return NextResponse.json({
    events,
    source,
    count: events.length,
    lastSync: new Date().toISOString(),
    userTimezone,
    recurrenceExpanded,
    recurrenceHorizonDays,
    note:
      'Events mapped from Discord scheduled events' +
      (recurrenceExpanded ? ' (recurrence pattern inferred from titles/descriptions)' : ''),
  });
}

function buildErrorResponse(message: string, userTimezone: string, status: number = 500) {
  return NextResponse.json(
    {
      events: [],
      error: message,
      source: 'discord',
      count: 0,
      lastSync: new Date().toISOString(),
      userTimezone,
      recurrenceExpanded: false,
    },
    { status }
  );
}

export async function GET(request: NextRequest) {
  // Member-only endpoint: require an authenticated session
  const session = (await getServerSession(authOptions as any)) as Session | null;
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const userTimezone = await resolveUserTimezone(session);
  const url = new URL(request.url);
  const expandParam = url.searchParams.get('expand');
  const horizonParam = url.searchParams.get('horizon');
  const expand = /^(1|true|yes|on)$/i.test(expandParam || '');
  const horizonDays =
    horizonParam && /^\d+$/.test(horizonParam)
      ? Math.min(MAX_HORIZON_DAYS, Math.max(MIN_HORIZON_DAYS, parseInt(horizonParam, 10)))
      : DEFAULT_HORIZON_DAYS; // sane bounds

  try {
    const discordService = getDiscordService();
    let discordEvents: DiscordScheduledEvent[] = [];
    try {
      discordEvents = await discordService.getScheduledEvents();
    } catch (err) {
      logger.error('Discord fetch error', err instanceof Error ? err : new Error(String(err)), {
        route: '/api/events/discord',
        method: 'GET',
      });
      return buildErrorResponse('Failed to fetch Discord events', userTimezone, 502);
    }

    // If no events, short-circuit
    if (!discordEvents.length) {
      return buildSuccessResponse({
        events: [],
        source: 'discord',
        userTimezone,
        recurrenceExpanded: false,
        recurrenceHorizonDays: expand ? horizonDays : undefined,
      });
    }

    // Only expand recurrence when explicitly requested; otherwise return base events
    const mapped = expand
      ? mapDiscordEventsToEventData(discordEvents, userTimezone, horizonDays)
      : discordEvents.map((e) => mapDiscordEventToEventData(e, userTimezone));
    const recurrenceExpanded = expand && mapped.length > discordEvents.length;

    return buildSuccessResponse({
      events: mapped,
      source: 'discord',
      userTimezone,
      recurrenceExpanded,
      recurrenceHorizonDays: expand ? horizonDays : undefined,
    });
  } catch (error) {
    logger.error('Unexpected error', error instanceof Error ? error : new Error(String(error)), {
      route: '/api/events/discord',
      method: 'GET',
    });
    return buildErrorResponse('Unexpected server error', userTimezone, 500);
  }
}

export async function POST(request: NextRequest) {
  // Member-only endpoint: require an authenticated session
  const session = (await getServerSession(authOptions as any)) as Session | null;
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const userTimezone = await resolveUserTimezone(session);
  try {
    const body = await request.json().catch(() => ({}));
    const { eventId, expand, horizon } = body || {};
    const expandFlag = /^(1|true|yes|on)$/i.test(String(expand || ''));
    const horizonDays =
      horizon && /^\d+$/.test(String(horizon))
        ? Math.min(MAX_HORIZON_DAYS, Math.max(MIN_HORIZON_DAYS, parseInt(String(horizon), 10)))
        : DEFAULT_HORIZON_DAYS;

    const discordService = getDiscordService();

    if (eventId !== undefined && eventId !== null && eventId !== '') {
      const eventIdStr = String(eventId);
      // Validate against the Discord snowflake format before hitting the API
      if (!SNOWFLAKE_REGEX.test(eventIdStr)) {
        return NextResponse.json(
          { error: 'Invalid eventId', events: [], source: 'discord', userTimezone },
          { status: 400 }
        );
      }
      try {
        const event = await discordService.getScheduledEvent(eventIdStr);
        if (!event) {
          return NextResponse.json(
            { error: 'Event not found', events: [], source: 'discord', userTimezone },
            { status: 404 }
          );
        }
        const mapped = mapDiscordEventToEventData(event, userTimezone);
        return NextResponse.json({
          event: mapped,
          source: 'discord',
          userTimezone,
          lastSync: new Date().toISOString(),
        });
      } catch (err) {
        logger.error('Event fetch error', err instanceof Error ? err : new Error(String(err)), {
          route: '/api/events/discord',
          method: 'POST',
          eventId: eventIdStr,
        });
        return buildErrorResponse('Failed to fetch event', userTimezone, 502);
      }
    }

    // Fallback to bulk like GET
    let discordEvents: DiscordScheduledEvent[] = [];
    try {
      discordEvents = await discordService.getScheduledEvents();
    } catch (err) {
      logger.error('Discord fetch error', err instanceof Error ? err : new Error(String(err)), {
        route: '/api/events/discord',
        method: 'POST',
      });
      return buildErrorResponse('Failed to fetch Discord events', userTimezone, 502);
    }

    // Only expand recurrence when explicitly requested; otherwise return base events
    const mapped = expandFlag
      ? mapDiscordEventsToEventData(discordEvents, userTimezone, horizonDays)
      : discordEvents.map((e) => mapDiscordEventToEventData(e, userTimezone));
    const recurrenceExpanded = expandFlag && mapped.length > discordEvents.length;

    return buildSuccessResponse({
      events: mapped,
      source: 'discord',
      userTimezone,
      recurrenceExpanded,
      recurrenceHorizonDays: expandFlag ? horizonDays : undefined,
    });
  } catch (error) {
    logger.error('Unexpected error', error instanceof Error ? error : new Error(String(error)), {
      route: '/api/events/discord',
      method: 'POST',
    });
    return buildErrorResponse('Unexpected server error', userTimezone, 500);
  }
}
