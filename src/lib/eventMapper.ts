import { DiscordScheduledEvent } from '@/types/DiscordEvent';
import { getTimeInTimezone, getWeekdayInTimezone } from './timezone';

// Event type enum
export enum EventType {
  General = 'general',
  AydoExpress = 'express',
  EmpyrionIndustries = 'empyrion',
  MidnightSecurity = 'security',
}

// Internal event representation
export interface EventData {
  id: number;
  title: string;
  date: Date; // UTC date of the instance
  time: string; // Human readable time in user's timezone
  type: EventType;
  description: string;
  isRecurringInstance?: boolean;
  originalDiscordEventId?: string;
  recurrencePattern?: string; // e.g. Mon/Wed/Fri or Mon
  recurrenceIntervalWeeks?: number; // 1 (weekly), 2 (biweekly), etc.
}

// Stable 32-bit integer hash for strings (djb2 variant)
function stringToStableInt(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) + hash + input.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  return Math.abs(hash);
}

/** Map a single Discord event */
export function mapDiscordEventToEventData(
  discordEvent: DiscordScheduledEvent,
  userTimezone: string = 'UTC'
): EventData {
  const startDate = new Date(discordEvent.scheduled_start_time);
  const eventType = determineEventType(discordEvent.name, discordEvent.description || '');
  const timeString = getTimeInTimezone(startDate, userTimezone);

  // The Discord snowflake (string) is the source of identity. Snowflakes exceed
  // Number.MAX_SAFE_INTEGER, so never coerce them to a JS number. When a bounded
  // numeric key is needed, derive a stable, collision-resistant hash of id+start.
  const numericId = stringToStableInt(`${discordEvent.id}|${startDate.toISOString()}`);

  return {
    id: numericId,
    title: discordEvent.name,
    date: startDate,
    time: timeString,
    type: eventType,
    description: discordEvent.description || 'Discord scheduled event',
    originalDiscordEventId: discordEvent.id,
  };
}

/** Determine event type from keywords */
function determineEventType(title: string, description: string): EventType {
  const text = (title + ' ' + description).toLowerCase();
  if (/(security|escort|protection|midnight|patrol|combat|pvp|bounty|defense|tactical)/.test(text))
    return EventType.MidnightSecurity;
  if (/(cargo|hauling|transport|aydoexpress|aydo express|delivery|logistics)/.test(text))
    return EventType.AydoExpress;
  if (/(mining|empyrion|industries|extraction|ore|asteroid|refinery)/.test(text))
    return EventType.EmpyrionIndustries;
  return EventType.General;
}

// Map day names to JS getDay() numbers (0=Sun ... 6=Sat)
const DAY_NAME_MAP: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function detectRecurringPattern(
  title: string,
  description: string
): { weekdays: number[]; intervalWeeks: number } | null {
  const text = (title + ' ' + description).toLowerCase();
  const found = new Set<number>();
  let intervalWeeks = 1;

  const hasEvery =
    /(\bevery\b|\beach\b|\bweekly\b|\brepeats?\b|\brecurs?\b|\bmondays\b|\btuesdays\b|\bwednesdays\b|\bthursdays\b|\bfridays\b|\bsaturdays\b|\bsundays\b)/.test(
      text
    );
  const isBiWeekly = /(every other|biweekly|bi-weekly|every 2(nd)? week)/.test(text);
  if (isBiWeekly) intervalWeeks = 2;

  // Weekdays / Weekends
  if (/\bweekdays?\b/.test(text)) [1, 2, 3, 4, 5].forEach((d) => found.add(d));
  if (/\bweekends?\b/.test(text)) [0, 6].forEach((d) => found.add(d));

  // Ranges: Mon-Fri, Fri-Mon
  const rangeRegex =
    /(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\s*-\s*(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)/g;
  let rangeMatch: RegExpExecArray | null;
  while ((rangeMatch = rangeRegex.exec(text)) !== null) {
    const start = DAY_NAME_MAP[rangeMatch[1] as keyof typeof DAY_NAME_MAP];
    const end = DAY_NAME_MAP[rangeMatch[2] as keyof typeof DAY_NAME_MAP];
    if (start !== undefined && end !== undefined) {
      if (start <= end) {
        for (let d = start; d <= end; d++) found.add(d);
      } else {
        for (let d = start; d <= 6; d++) found.add(d);
        for (let d = 0; d <= end; d++) found.add(d);
      }
    }
  }

  // Abbreviations
  if (/\bmwf\b/.test(text)) [1, 3, 5].forEach((d) => found.add(d));
  if (/\b(tth|tuth)\b/.test(text)) [2, 4].forEach((d) => found.add(d));

  // Explicit day mentions
  const tokens = text.match(
    /\b(sun(day)?|mon(day)?|tue(s|sday)?|wed(nes(day)?)?|thu(r|rs|rsday)?|fri(day)?|sat(urday)?)s?\b/g
  );
  if (tokens) {
    tokens.forEach((tok) => {
      const normalized = tok.replace(/s$/, '');
      const day = DAY_NAME_MAP[normalized as keyof typeof DAY_NAME_MAP];
      if (day !== undefined) found.add(day);
    });
  }

  // Slash lists like mon/wed/fri
  const slashPattern =
    /(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(\/(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun))+?/g;
  const slashMatches = text.match(slashPattern);
  if (slashMatches) {
    slashMatches.forEach((group) => {
      group.split('/').forEach((part) => {
        const day = DAY_NAME_MAP[part as keyof typeof DAY_NAME_MAP];
        if (day !== undefined) found.add(day);
      });
    });
  }

  if (found.size === 0) return null;
  // If only one weekday and no recurrence cue present, assume single instance
  if (found.size === 1 && !hasEvery && intervalWeeks === 1) return null;

  return { weekdays: Array.from(found).sort(), intervalWeeks };
}

function buildEventUniquenessKey(title: string, date: Date): string {
  return `${title.toLowerCase()}::${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}-${date.getUTCHours()}-${date.getUTCMinutes()}`;
}

function sameDateTimeUTC(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate() &&
    a.getUTCHours() === b.getUTCHours() &&
    a.getUTCMinutes() === b.getUTCMinutes()
  );
}

function expandRecurringEventInstances(
  base: EventData,
  weekdays: number[],
  intervalWeeks: number,
  userTimezone: string,
  horizonDays: number,
  existingKeySet: Set<string>
): EventData[] {
  const expansions: EventData[] = [];
  const baseDate = base.date; // UTC
  const baseHour = baseDate.getUTCHours();
  const baseMinute = baseDate.getUTCMinutes();
  const now = new Date();
  const start = baseDate < now ? now : baseDate;
  const horizonEnd = new Date(start.getTime() + horizonDays * 24 * 60 * 60 * 1000);

  // Translate intended local weekdays -> UTC weekdays at the base event's local time.
  // Example: Mon 20:00 ET is Tue 00:00 UTC, so local Monday corresponds to UTC Tuesday.
  // Derive the local weekday from the actual UTC instant (via formatToParts),
  // never from a reparsed Date whose absolute instant has been corrupted.
  const baseLocalWeekday = getWeekdayInTimezone(baseDate, userTimezone);
  const shiftLocalToUTC = (baseDate.getUTCDay() - baseLocalWeekday + 7) % 7; // add shift then mod 7
  const utcWeekdays = weekdays.map((d) => (d + shiftLocalToUTC) % 7);

  for (
    let cursor = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
    );
    cursor <= horizonEnd;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const dow = cursor.getUTCDay();
    if (!utcWeekdays.includes(dow)) continue;

    const occurrence = new Date(
      Date.UTC(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth(),
        cursor.getUTCDate(),
        baseHour,
        baseMinute
      )
    );
    if (sameDateTimeUTC(occurrence, baseDate)) continue;

    // interval filter (biweekly etc.) relative to base date
    if (intervalWeeks > 1) {
      const weeksSinceBase = Math.floor(
        (occurrence.getTime() - baseDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      if (weeksSinceBase % intervalWeeks !== 0) continue;
    }

    const key = buildEventUniquenessKey(base.title, occurrence);
    if (existingKeySet.has(key)) continue;
    existingKeySet.add(key);

    // generate synthetic id stable-ish
    const dayDelta = Math.floor(
      (occurrence.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const genId = base.id * 1000 + dayDelta;

    expansions.push({
      ...base,
      id: genId,
      date: occurrence,
      time: getTimeInTimezone(occurrence, userTimezone),
      isRecurringInstance: true,
      recurrencePattern: weekdays.map((w) => DAY_ORDER[w]).join('/'),
      recurrenceIntervalWeeks: intervalWeeks,
    });
  }
  return expansions;
}

/** Map and expand multiple Discord events */
export function mapDiscordEventsToEventData(
  discordEvents: DiscordScheduledEvent[],
  userTimezone: string = 'UTC',
  recurrenceHorizonDays: number = 180
): EventData[] {
  const baseEvents = discordEvents.map((e) => mapDiscordEventToEventData(e, userTimezone));
  const existingKeySet = new Set<string>();
  baseEvents.forEach((e) => existingKeySet.add(buildEventUniquenessKey(e.title, e.date)));

  const all: EventData[] = [...baseEvents];

  for (const base of baseEvents) {
    const source = discordEvents.find((de) => de.id === base.originalDiscordEventId);
    const pattern = detectRecurringPattern(
      base.title,
      source?.description || base.description || ''
    );
    if (pattern) {
      const expansions = expandRecurringEventInstances(
        base,
        pattern.weekdays,
        pattern.intervalWeeks,
        userTimezone,
        recurrenceHorizonDays,
        existingKeySet
      );
      if (expansions.length) {
        // annotate original for UI (optional)
        base.recurrencePattern =
          base.recurrencePattern || pattern.weekdays.map((w) => DAY_ORDER[w]).join('/');
        base.recurrenceIntervalWeeks = base.recurrenceIntervalWeeks || pattern.intervalWeeks;
        all.push(...expansions);
      }
    }
  }

  all.sort((a, b) => a.date.getTime() - b.date.getTime());
  return all;
}

/** Format Discord event time for display */
export function formatEventTime(discordEvent: DiscordScheduledEvent): string {
  const startDate = new Date(discordEvent.scheduled_start_time);
  const endDate = new Date(discordEvent.scheduled_end_time || startDate.getTime());
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' };
  const start = startDate.toLocaleTimeString('en-US', opts);
  if (discordEvent.scheduled_end_time) {
    return `${start} - ${endDate.toLocaleTimeString('en-US', opts)} UTC`;
  }
  return `${start} UTC`;
}
