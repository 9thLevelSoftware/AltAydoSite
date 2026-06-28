import { useState, useEffect, useCallback, useRef } from 'react';
import { EventData } from '@/lib/eventMapper';
import { useUserTimezone } from './useUserTimezone';

// No fallback events - only pull from Discord

interface UseEventsReturn {
  events: EventData[];
  loading: boolean;
  error: string | null;
  source: 'discord' | 'fallback';
  lastSync: string | null;
  refetch: () => Promise<void>;
  refreshWithTimezone: () => Promise<void>;
}

interface DiscordEventsResponse {
  events: EventData[];
  source?: string;
  count?: number;
  lastSync?: string;
  error?: string;
  recurrenceExpanded?: boolean;
  recurrenceHorizonDays?: number;
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'discord' | 'fallback'>('fallback');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // Get user's timezone but don't auto-refetch on changes
  const {
    timezone: userTimezone,
    loading: timezoneLoading,
    refetch: refetchTimezone,
  } = useUserTimezone();

  const fetchEvents = useCallback(
    async (tzOverride?: string) => {
      const activeTimezone = tzOverride ?? userTimezone;
      try {
        setLoading(true);
        setError(null);

        // Build query params for optional recurrence expansion
        const qp = new URLSearchParams();
        const expandCfg = process.env.NEXT_PUBLIC_EVENTS_RECURRENCE_EXPAND;
        const horizonCfg = process.env.NEXT_PUBLIC_EVENTS_RECURRENCE_HORIZON_DAYS;
        if (expandCfg && /^(1|true|yes|on)$/i.test(expandCfg)) {
          qp.set('expand', '1');
          if (horizonCfg && /^\d+$/.test(horizonCfg)) {
            qp.set('horizon', horizonCfg);
          }
        }

        const url = qp.toString() ? `/api/events/discord?${qp.toString()}` : '/api/events/discord';

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // Check HTTP status before trusting the body shape
        if (!response.ok) {
          const data: DiscordEventsResponse | null = await response.json().catch(() => null);
          const statusError =
            data?.error || `Failed to fetch events (${response.status} ${response.statusText})`;
          console.warn('Discord events request failed:', statusError);
          setEvents([]);
          setSource('fallback');
          setError(statusError);
          return;
        }

        const data: DiscordEventsResponse | null = await response.json().catch(() => null);
        const hasEvents = Array.isArray(data?.events) && data.events.length > 0;

        if (data?.error && !hasEvents) {
          // Discord integration failed, no events to show
          console.warn('Discord events unavailable:', data.error);
          setEvents([]);
          setSource('fallback');
          setError(data.error);
        } else if (hasEvents) {
          // Discord events available
          const processedEvents = data!.events.map((event) => {
            const eventDate = new Date(event.date);
            return {
              ...event,
              date: eventDate,
            };
          });
          console.log(
            'Processed events with current timezone:',
            activeTimezone,
            processedEvents.length,
            'events',
            {
              recurrenceExpanded: data!.recurrenceExpanded,
              horizon: data!.recurrenceHorizonDays,
            }
          );
          setEvents(processedEvents);
          setSource('discord');
          setLastSync(data!.lastSync || new Date().toISOString());
          setError(null);
        } else {
          // No events from Discord
          setEvents([]);
          setSource('fallback');
          setError('No Discord events found');
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
        setEvents([]);
        setSource('fallback');
      } finally {
        setLoading(false);
      }
    },
    [userTimezone]
  );

  // Refresh both timezone and events (for when timezone changes)
  const refreshWithTimezone = useCallback(async () => {
    console.log('Refreshing timezone and events...');
    // Await the timezone refetch, then the event refetch, so the returned
    // Promise only resolves once events have actually been refreshed.
    await refetchTimezone();
    await fetchEvents();
  }, [refetchTimezone, fetchEvents]);

  // Fetch events only on initial load
  useEffect(() => {
    if (timezoneLoading || hasInitialized.current) {
      return;
    }
    console.log('Initial events fetch with timezone:', userTimezone);
    fetchEvents();
    hasInitialized.current = true;
  }, [timezoneLoading, userTimezone, fetchEvents]); // Only run once after timezone loads

  return {
    events,
    loading,
    error,
    source,
    lastSync,
    refetch: fetchEvents,
    refreshWithTimezone,
  };
}
