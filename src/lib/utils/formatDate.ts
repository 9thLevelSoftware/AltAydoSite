/**
 * Safe date formatting helpers.
 *
 * API-supplied date strings can be malformed (empty, partial, or otherwise
 * un-parseable). Passing an `Invalid Date` to `Intl.DateTimeFormat.format()`
 * throws a `RangeError`, which previously crashed the cards/detail views that
 * rendered operation and mission dates. These helpers return a fallback label
 * instead of throwing so the UI degrades gracefully.
 */

const DEFAULT_FALLBACK = 'Date TBD';
const DEFAULT_LOCALE = 'en-US';

/**
 * Format a date value with `Intl.DateTimeFormat`, returning a fallback label
 * when the value cannot be parsed into a valid date.
 *
 * @param dateString - The date value (ISO string, timestamp, or Date).
 * @param options - `Intl.DateTimeFormat` options for the call site.
 * @param fallback - Label returned for invalid/empty dates (default: "Date TBD").
 * @param locale - BCP 47 locale tag (default: "en-US").
 */
export function formatDate(
  dateString: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback: string = DEFAULT_FALLBACK,
  locale: string = DEFAULT_LOCALE
): string {
  if (dateString === null || dateString === undefined || dateString === '') {
    return fallback;
  }

  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, options).format(date);
}
