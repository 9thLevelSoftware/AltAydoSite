import { logger } from '@/lib/logger';

// Common timezone options for user selection
export const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET)' },
  { value: 'Europe/Moscow', label: 'Moscow Standard Time (MSK)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (HKT)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (KST)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time (AET)' },
  { value: 'Australia/Perth', label: 'Australian Western Time (AWT)' },
  { value: 'Pacific/Auckland', label: 'New Zealand Standard Time (NZST)' },
];

/**
 * Convert a UTC date to a user's timezone
 */
export function convertToUserTimezone(utcDate: Date, userTimezone: string): Date {
  if (!userTimezone || userTimezone === 'UTC') {
    return utcDate;
  }

  try {
    // Create a new date in the user's timezone
    const userTime = new Date(utcDate.toLocaleString('en-US', { timeZone: userTimezone }));
    return userTime;
  } catch (error) {
    logger.warn('Invalid timezone, falling back to UTC', { module: 'timezone', userTimezone });
    return utcDate;
  }
}

// Short weekday names (en-US) -> JS getDay() index (0=Sun ... 6=Sat)
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Calendar fields of a UTC instant as observed in a given timezone.
 * These are LOCAL wall-clock fields and must be kept separate from the
 * underlying UTC instant they were derived from.
 */
export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0=Sun ... 6=Sat
  hour: number; // 0-23
  minute: number;
}

/**
 * Extract the target zone's calendar fields for a UTC instant using
 * Intl.DateTimeFormat.formatToParts. This avoids reparsing a locale string
 * (which would corrupt the absolute instant) and keeps UTC instants and
 * local calendar fields strictly separate.
 */
export function getZonedParts(date: Date, userTimezone: string): ZonedParts {
  const timeZone = userTimezone || 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const lookup: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== 'literal') lookup[part.type] = part.value;
    }

    // Some engines emit '24' for midnight under hour12: false.
    let hour = parseInt(lookup.hour, 10);
    if (hour === 24) hour = 0;

    return {
      year: parseInt(lookup.year, 10),
      month: parseInt(lookup.month, 10),
      day: parseInt(lookup.day, 10),
      weekday: WEEKDAY_INDEX[lookup.weekday] ?? date.getUTCDay(),
      hour,
      minute: parseInt(lookup.minute, 10),
    };
  } catch (error) {
    logger.warn('Invalid timezone, falling back to UTC', { module: 'timezone', userTimezone });
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      weekday: date.getUTCDay(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
    };
  }
}

/**
 * Get the local weekday (0=Sun ... 6=Sat) of a UTC instant in a given timezone.
 */
export function getWeekdayInTimezone(date: Date, userTimezone: string): number {
  return getZonedParts(date, userTimezone).weekday;
}

/**
 * Format a date in the user's timezone
 */
export function formatDateInTimezone(
  date: Date,
  userTimezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!userTimezone || userTimezone === 'UTC') {
    return date.toLocaleString('en-US', {
      ...options,
      timeZone: 'UTC',
      timeZoneName: 'short',
    });
  }

  try {
    return date.toLocaleString('en-US', {
      ...options,
      timeZone: userTimezone,
      timeZoneName: 'short',
    });
  } catch (error) {
    logger.warn('Invalid timezone, falling back to UTC', { module: 'timezone', userTimezone });
    return date.toLocaleString('en-US', {
      ...options,
      timeZone: 'UTC',
      timeZoneName: 'short',
    });
  }
}

/**
 * Get time string in user's timezone
 */
export function getTimeInTimezone(date: Date, userTimezone: string): string {
  return formatDateInTimezone(date, userTimezone, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get full date and time string in user's timezone
 */
export function getDateTimeInTimezone(date: Date, userTimezone: string): string {
  return formatDateInTimezone(date, userTimezone, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get timezone abbreviation
 */
export function getTimezoneAbbreviation(userTimezone: string): string {
  if (!userTimezone || userTimezone === 'UTC') {
    return 'UTC';
  }

  try {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
      timeZone: userTimezone,
      timeZoneName: 'short',
    });

    // Extract timezone abbreviation from the formatted string
    const parts = timeString.split(' ');
    return parts[parts.length - 1] || userTimezone;
  } catch (error) {
    logger.warn('Invalid timezone, falling back to UTC', { module: 'timezone', userTimezone });
    return 'UTC';
  }
}

/**
 * Detect user's browser timezone
 */
export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    logger.warn('Could not detect user timezone, falling back to UTC', { module: 'timezone' });
    return 'UTC';
  }
}
