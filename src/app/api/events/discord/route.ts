import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/auth';
import { getDiscordService } from '@/lib/discord';
import { mapDiscordEventsToEventData, mapDiscordEventToEventData } from '@/lib/eventMapper';
import * as userStorage from '@/lib/user-storage';
import { DiscordScheduledEvent } from '@/types/DiscordEvent';
import type { Session } from 'next-auth';

// Ensure Node.js runtime (discord.js compatibility if needed elsewhere)
export const runtime = 'nodejs';

async function resolveUserTimezone(): Promise<string> {
  try {
    const session = await getServerSession(authOptions as any) as Session | null;
    if (session?.user?.id) {
      const user = await userStorage.getUserById(session.user.id);
      if (user?.timezone) return user.timezone;
    }
  } catch (e) {
    console.warn('[Events API] Timezone lookup failed, defaulting to UTC:', e);
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
    note: 'Events mapped from Discord scheduled events' + (recurrenceExpanded ? ' (recurrence pattern inferred from titles/descriptions)' : '')
  });
}

function buildErrorResponse(message: string, userTimezone: string) {
  return NextResponse.json({
    events: [],
    error: message,
    source: 'discord',
    count: 0,
    lastSync: new Date().toISOString(),
    userTimezone,
    recurrenceExpanded: false
  });
}

export async function GET(request: NextRequest) {
  const userTimezone = await resolveUserTimezone();
  const url = new URL(request.url);
  const expandParam = url.searchParams.get('expand');
  const horizonParam = url.searchParams.get('horizon');
  const expand = /^(1|true|yes|on)$/i.test(expandParam || '');
  const horizonDays = horizonParam && /^\d+$/.test(horizonParam) ? Math.min(365, Math.max(7, parseInt(horizonParam, 10))) : 180; // sane bounds

  try {
    const discordService = getDiscordService();
    let discordEvents: DiscordScheduledEvent[] = [];
    try {
      discordEvents = await discordService.getScheduledEvents();
    } catch (err) {
      console.error('[Events API][GET] Discord fetch error:', err);
      return buildErrorResponse('Failed to fetch Discord events', userTimezone);
    }

    // If no events, short-circuit
    if (!discordEvents.length) {
      return buildSuccessResponse({ events: [], source: 'discord', userTimezone, recurrenceExpanded: false, recurrenceHorizonDays: expand ? horizonDays : undefined });
    }

    // Always map; expansion only meaningful if expand flag set (we still use same mapper but report flag based on length change)
    const mapped = mapDiscordEventsToEventData(discordEvents, userTimezone, expand ? horizonDays : 1); // horizon 1 => minimal expansion attempt
    const baseMapped = discordEvents.map(e => mapDiscordEventToEventData(e, userTimezone));
    const recurrenceExpanded = mapped.length > baseMapped.length;

    return buildSuccessResponse({
      events: mapped,
      source: 'discord',
      userTimezone,
      recurrenceExpanded: recurrenceExpanded && expand,
      recurrenceHorizonDays: expand ? horizonDays : undefined
    });
  } catch (error) {
    console.error('[Events API][GET] Unexpected error:', error);
    return buildErrorResponse('Unexpected server error', userTimezone);
  }
}

export async function POST(request: NextRequest) {
  const userTimezone = await resolveUserTimezone();
  try {
    const body = await request.json().catch(() => ({}));
    const { eventId, expand, horizon } = body || {};
    const expandFlag = /^(1|true|yes|on)$/i.test(String(expand || ''));
    const horizonDays = horizon && /^\d+$/.test(String(horizon)) ? Math.min(365, Math.max(7, parseInt(String(horizon), 10))) : 180;

    const discordService = getDiscordService();

    if (eventId) {
      try {
        const event = await discordService.getScheduledEvent(String(eventId));
        if (!event) {
          return NextResponse.json({ error: 'Event not found', events: [], source: 'discord', userTimezone }, { status: 404 });
        }
        const mapped = mapDiscordEventToEventData(event, userTimezone);
        return NextResponse.json({ event: mapped, source: 'discord', userTimezone, lastSync: new Date().toISOString() });
      } catch (err) {
        console.error('[Events API][POST] Event fetch error:', err);
        return buildErrorResponse('Failed to fetch event', userTimezone);
      }
    }

    // Fallback to bulk like GET
    let discordEvents: DiscordScheduledEvent[] = [];
    try {
      discordEvents = await discordService.getScheduledEvents();
    } catch (err) {
      console.error('[Events API][POST] Discord fetch error:', err);
      return buildErrorResponse('Failed to fetch Discord events', userTimezone);
    }

    const mapped = mapDiscordEventsToEventData(discordEvents, userTimezone, expandFlag ? horizonDays : 1);
    const baseMapped = discordEvents.map(e => mapDiscordEventToEventData(e, userTimezone));
    const recurrenceExpanded = mapped.length > baseMapped.length;

    return buildSuccessResponse({
      events: mapped,
      source: 'discord',
      userTimezone,
      recurrenceExpanded: recurrenceExpanded && expandFlag,
      recurrenceHorizonDays: expandFlag ? horizonDays : undefined
    });
  } catch (error) {
    console.error('[Events API][POST] Unexpected error:', error);
    return buildErrorResponse('Unexpected server error', userTimezone);
  }
}
