/**
 * Ship Data Formatting Utilities
 *
 * Pure functions for converting raw ShipDocument field values into
 * human-readable display strings. No side effects, no imports needed.
 *
 * Used by all ship browse UI components (cards, detail panels, tables).
 */

// ---------------------------------------------------------------------------
// Time Formatting
// ---------------------------------------------------------------------------

/**
 * Convert a timestamp to a human-readable relative time string.
 *
 * Examples: "just now", "5 minutes ago", "2 hours ago", "3 days ago"
 * Falls back to toLocaleDateString() for dates older than 30 days.
 *
 * Invalid timestamps render as "Unknown". Future dates within a small clock-skew
 * tolerance render as "just now"; further-future dates fall back to an absolute date.
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();

  // Guard against invalid input (unparseable string / Invalid Date)
  if (isNaN(diffMs)) {
    return 'Unknown';
  }

  // Guard against future dates: tolerate small clock skew (a few seconds),
  // otherwise fall back to an absolute date rather than mislabeling as "just now".
  if (diffMs < 0) {
    const FUTURE_SKEW_TOLERANCE_MS = 5000;
    if (-diffMs <= FUTURE_SKEW_TOLERANCE_MS) {
      return 'just now';
    }
    return then.toLocaleDateString();
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (diffDays <= 30) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }

  return then.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Dimension & Measurement Formatting
// ---------------------------------------------------------------------------

/**
 * Format ship dimensions as "L x W x H m".
 * Returns "N/A" if all three values are zero.
 */
export function formatDimensions(length: number, beam: number, height: number): string {
  if (length === 0 && beam === 0 && height === 0) {
    return 'N/A';
  }
  return `${length.toFixed(1)} x ${beam.toFixed(1)} x ${height.toFixed(1)} m`;
}

/**
 * Format crew capacity range.
 * Returns "1" for solo, "1-3" for range, "N/A" if both 0.
 */
export function formatCrew(min: number, max: number): string {
  if (min === 0 && max === 0) {
    return 'N/A';
  }
  if (min === max) {
    return String(min);
  }
  return `${min}-${max}`;
}

/**
 * Format cargo capacity in SCU.
 * Returns "None" if 0.
 */
export function formatCargo(scu: number): string {
  if (scu === 0) {
    return 'None';
  }
  return `${scu} SCU`;
}

/**
 * Format SCM speed in m/s.
 * Returns "N/A" if null or 0.
 */
export function formatSpeed(scmSpeed: number | null): string {
  if (scmSpeed === null || scmSpeed === 0) {
    return 'N/A';
  }
  return `${scmSpeed} m/s`;
}

// ---------------------------------------------------------------------------
// Status & Category Formatting
// ---------------------------------------------------------------------------

/**
 * Convert a production status slug to a display string.
 * "flight-ready" -> "Flight Ready", "in-concept" -> "In Concept"
 */
export function formatProductionStatus(status: string): string {
  if (!status) {
    return 'Unknown';
  }
  return status
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Title-case a size category.
 * "small" -> "Small", "capital" -> "Capital"
 */
export function formatSize(size: string): string {
  if (!size) {
    return 'Unknown';
  }
  return size.charAt(0).toUpperCase() + size.slice(1);
}
