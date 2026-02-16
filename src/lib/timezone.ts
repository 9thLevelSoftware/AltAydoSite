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
      timeZoneName: 'short'
    });
  }
  
  try {
    return date.toLocaleString('en-US', {
      ...options,
      timeZone: userTimezone,
      timeZoneName: 'short'
    });
  } catch (error) {
    logger.warn('Invalid timezone, falling back to UTC', { module: 'timezone', userTimezone });
    return date.toLocaleString('en-US', {
      ...options,
      timeZone: 'UTC',
      timeZoneName: 'short'
    });
  }
}

/**
 * Get time string in user's timezone
 */
export function getTimeInTimezone(date: Date, userTimezone: string): string {
  return formatDateInTimezone(date, userTimezone, {
    hour: '2-digit',
    minute: '2-digit'
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
    minute: '2-digit'
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
      timeZoneName: 'short'
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