/**
 * FleetYards API Client
 *
 * Fetches all ships from the FleetYards public API via paginated GET requests.
 * Handles pagination (Link header + response length), retry with exponential
 * backoff on 5xx/network errors, and 429 rate-limit responses with Retry-After.
 *
 * This module uses native fetch only -- no external HTTP libraries required.
 */

import { logger } from '@/lib/logger';
import type { FleetYardsShipResponse } from './types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FLEETYARDS_API_BASE = 'https://api.fleetyards.net/v1';

/** Maximum ships per page (FleetYards API cap) */
const PER_PAGE = 240;

/** Delay between page fetches to respect undocumented rate limits */
const PAGE_DELAY_MS = 300;

/** Maximum retry attempts per individual page fetch */
const MAX_RETRIES = 3;

/** Safety limit to prevent infinite pagination loops */
const MAX_PAGES = 20;

/**
 * Maximum time to wait for a single page fetch before aborting (env-overridable
 * via FLEETYARDS_FETCH_TIMEOUT_MS). Defaults to 15s.
 */
const FLEETYARDS_FETCH_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.FLEETYARDS_FETCH_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15_000;
})();

/** Maximum number of seconds to honor from a 429 Retry-After header */
const MAX_RETRY_AFTER_SECONDS = 60;

/** Trusted origin and path prefix for FleetYards API URLs (used to validate Link headers) */
const FLEETYARDS_API_ORIGIN = 'https://api.fleetyards.net';
const FLEETYARDS_MODELS_PATH_PREFIX = '/v1/models';

interface FleetYardsPagination {
  currentPage?: number;
  totalPages?: number;
}

interface FleetYardsModelsResponse {
  items: FleetYardsShipResponse[];
  meta?: {
    pagination?: FleetYardsPagination;
  };
}

function normalizeModelsResponse(
  body: unknown
): { ships: FleetYardsShipResponse[]; pagination?: FleetYardsPagination } | null {
  if (Array.isArray(body)) {
    return { ships: body as FleetYardsShipResponse[] };
  }

  if (body && typeof body === 'object') {
    const response = body as Partial<FleetYardsModelsResponse>;
    if (Array.isArray(response.items)) {
      return {
        ships: response.items,
        pagination: response.meta?.pagination,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Link Header Parser
// ---------------------------------------------------------------------------

/**
 * Parses an RFC 8288 Link header and extracts the `rel="next"` URL.
 *
 * Example input:
 *   `<https://api.fleetyards.net/v1/models?page=2&perPage=200>; rel="next"`
 *
 * @returns Object with optional `next` URL string.
 */
function parseLinkHeader(linkHeader: string | null): { next?: string } {
  if (!linkHeader) return {};

  const result: { next?: string } = {};
  const parts = linkHeader.split(',');

  for (const part of parts) {
    const urlMatch = part.match(/<([^>]+)>/);
    const relMatch = part.match(/rel="([^"]+)"/);

    if (urlMatch && relMatch && relMatch[1] === 'next') {
      result.next = urlMatch[1];
    }
  }

  return result;
}

/**
 * Validates that a `rel="next"` URL points at the trusted FleetYards models
 * endpoint before we follow it. Prevents pagination from being redirected to an
 * arbitrary host by a malformed or malicious Link header.
 */
function isValidNextUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    return (
      parsed.origin === FLEETYARDS_API_ORIGIN &&
      parsed.pathname.startsWith(FLEETYARDS_MODELS_PATH_PREFIX)
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Abort Signal Helper
// ---------------------------------------------------------------------------

/**
 * Creates an AbortSignal that fires after `timeoutMs`, preferring the native
 * `AbortSignal.timeout` and falling back to a manual `AbortController` + timer.
 * Mirrors the helper in `src/lib/ships/r2-image-mirror.ts`.
 */
function createAbortSignal(timeoutMs: number): { signal?: AbortSignal; cleanup?: () => void } {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return { signal: AbortSignal.timeout(timeoutMs) };
  }

  if (typeof AbortController !== 'undefined') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return {
      signal: controller.signal,
      cleanup: () => clearTimeout(timeoutId),
    };
  }

  return {};
}

// ---------------------------------------------------------------------------
// Retry-After Parser
// ---------------------------------------------------------------------------

/**
 * Parses a 429 `Retry-After` header, supporting both the delta-seconds form
 * (e.g. `120`) and the HTTP-date form (e.g. `Wed, 21 Oct 2015 07:28:00 GMT`).
 *
 * The result is clamped to [0, MAX_RETRY_AFTER_SECONDS] so a hostile or buggy
 * server cannot stall the sync indefinitely. Logs a warning when the header is
 * unparseable (falls back to the default) or when the value is capped.
 *
 * @returns The number of seconds to wait before retrying.
 */
function parseRetryAfter(headerValue: string | null, page: number): number {
  const DEFAULT_SECONDS = 5;
  if (!headerValue) return DEFAULT_SECONDS;

  const trimmed = headerValue.trim();
  let seconds: number;

  // delta-seconds form (try Number first)
  const asNumber = Number(trimmed);
  if (trimmed !== '' && Number.isFinite(asNumber)) {
    seconds = asNumber;
  } else {
    // HTTP-date form
    const dateMs = Date.parse(trimmed);
    if (Number.isNaN(dateMs)) {
      logger.warn('FleetYards API Retry-After header unparseable, using default', {
        module: 'fleetyards',
        page,
        retryAfter: headerValue,
        defaultSeconds: DEFAULT_SECONDS,
      });
      return DEFAULT_SECONDS;
    }
    seconds = (dateMs - Date.now()) / 1000;
  }

  // Clamp to a sane range
  if (seconds < 0) seconds = 0;
  if (seconds > MAX_RETRY_AFTER_SECONDS) {
    logger.warn('FleetYards API Retry-After exceeds maximum, capping', {
      module: 'fleetyards',
      page,
      requestedSeconds: seconds,
      cappedSeconds: MAX_RETRY_AFTER_SECONDS,
    });
    seconds = MAX_RETRY_AFTER_SECONDS;
  }

  return seconds;
}

// ---------------------------------------------------------------------------
// Fetch with Retry
// ---------------------------------------------------------------------------

/**
 * Fetches a URL with retry logic for transient failures.
 *
 * Retry policy:
 * - Network errors: retry with exponential backoff (1s, 2s, 3s)
 * - Timeouts (request exceeds FLEETYARDS_FETCH_TIMEOUT_MS): treated like a
 *   network error -- retry with exponential backoff
 * - 5xx responses: retry with exponential backoff
 * - 429 (rate limited): wait Retry-After header value (or 5s default), then retry
 * - 4xx (not 429): do NOT retry -- these indicate a client-side problem
 *
 * @returns The Response object on success, or null after exhausting retries.
 */
async function fetchWithRetry(
  url: string,
  retries: number,
  page: number
): Promise<{ response: Response | null; error?: string }> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const abort = createAbortSignal(FLEETYARDS_FETCH_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: abort.signal,
        });
      } finally {
        // Clear the fallback timer once the request settles so a returned
        // response is not aborted mid body-read by a late timeout.
        abort.cleanup?.();
      }

      // Success
      if (response.ok) {
        return { response };
      }

      // Rate limited -- respect Retry-After
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const waitSeconds = parseRetryAfter(retryAfterHeader, page);
        const waitMs = waitSeconds * 1000;
        logger.warn('FleetYards API rate limited (429)', {
          module: 'fleetyards',
          page,
          waitSeconds,
          attempt,
          retries,
        });
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      // Client error (not 429) -- do not retry
      if (response.status >= 400 && response.status < 500) {
        const body = await response.text().catch(() => '(no body)');
        const error = `FleetYards API returned ${response.status} for page ${page}: ${body.slice(0, 500)}`;
        logger.warn('FleetYards API client error', {
          module: 'fleetyards',
          page,
          status: response.status,
          body,
        });
        return { response: null, error };
      }

      // Server error (5xx) -- retry with backoff
      if (response.status >= 500) {
        const body = await response.text().catch(() => '(no body)');
        lastError = `FleetYards API returned ${response.status} for page ${page}: ${body.slice(0, 500)}`;
        const waitMs = 1000 * attempt;
        logger.warn('FleetYards API server error, retrying', {
          module: 'fleetyards',
          page,
          status: response.status,
          body,
          attempt,
          retries,
          waitMs,
        });
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      // Unexpected status -- treat as non-retryable
      const body = await response.text().catch(() => '(no body)');
      const error = `FleetYards API returned unexpected status ${response.status} for page ${page}: ${body.slice(0, 500)}`;
      logger.warn('FleetYards API unexpected status', {
        module: 'fleetyards',
        page,
        status: response.status,
        body,
      });
      return { response: null, error };
    } catch (error) {
      // Timeout (AbortSignal.timeout -> TimeoutError, AbortController -> AbortError)
      // and network errors are both transient -- retry with backoff.
      const isTimeout =
        error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = isTimeout
        ? `FleetYards API request timed out after ${FLEETYARDS_FETCH_TIMEOUT_MS}ms for page ${page}`
        : `FleetYards API network error for page ${page}: ${errorMessage}`;
      const waitMs = 1000 * attempt;
      logger.warn(
        isTimeout
          ? 'FleetYards API request timed out, retrying'
          : 'FleetYards API network error, retrying',
        {
          module: 'fleetyards',
          page,
          ...(isTimeout ? { timeoutMs: FLEETYARDS_FETCH_TIMEOUT_MS } : {}),
          errorMessage,
          attempt,
          retries,
          waitMs,
        }
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  logger.warn('FleetYards API page failed after retries', { module: 'fleetyards', page, retries });
  return { response: null, error: lastError };
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

/**
 * Fetches all ships from the FleetYards API with automatic pagination.
 *
 * Pagination strategy:
 * 1. Parse `Link` header for `rel="next"` URL
 * 2. If no Link header, check if response length < PER_PAGE (last page)
 * 3. Stop at MAX_PAGES as a safety limit
 *
 * @returns An object containing:
 *   - `ships`: Array of raw API response objects
 *   - `pagesProcessed`: Number of pages successfully fetched
 *   - `errors`: Array of error messages from failed pages
 */
export async function fetchAllShips(): Promise<{
  ships: FleetYardsShipResponse[];
  pagesProcessed: number;
  errors: string[];
}> {
  const allShips: FleetYardsShipResponse[] = [];
  const errors: string[] = [];
  let pagesProcessed = 0;
  let nextUrl: string | undefined = `${FLEETYARDS_API_BASE}/models?page=1&perPage=${PER_PAGE}`;
  let page = 1;

  while (nextUrl && page <= MAX_PAGES) {
    logger.info('Fetching FleetYards page', { module: 'fleetyards', page });

    const { response, error } = await fetchWithRetry(nextUrl, MAX_RETRIES, page);

    if (!response) {
      const errorMsg = error ?? `Page ${page} failed after retries -- skipping`;
      errors.push(errorMsg);
      // Stop pagination if a page fails entirely (data may be incomplete)
      break;
    }

    let pageShips: FleetYardsShipResponse[];
    let pagination: FleetYardsPagination | undefined;
    try {
      const normalized = normalizeModelsResponse(await response.json());
      if (!normalized) {
        const errorMsg = `Page ${page} returned an unsupported FleetYards response shape; content-type=${response.headers.get('content-type') ?? 'unknown'}`;
        errors.push(errorMsg);
        logger.warn('FleetYards API unsupported response shape', {
          module: 'fleetyards',
          page,
        });
        break;
      }

      pageShips = normalized.ships;
      pagination = normalized.pagination;
    } catch (parseError) {
      const errorMsg = `Page ${page} JSON parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`;
      errors.push(errorMsg);
      logger.warn('FleetYards API JSON parse error', {
        module: 'fleetyards',
        page,
        errorMessage: parseError instanceof Error ? parseError.message : String(parseError),
      });
      break;
    }

    // Empty response means no more data
    if (!Array.isArray(pageShips) || pageShips.length === 0) {
      logger.info('FleetYards pagination complete (empty response)', {
        module: 'fleetyards',
        page,
      });
      break;
    }

    allShips.push(...pageShips);
    pagesProcessed++;
    logger.info('FleetYards page fetched', {
      module: 'fleetyards',
      page,
      shipCount: pageShips.length,
    });

    // Determine if there are more pages
    if (typeof pagination?.currentPage === 'number' && typeof pagination?.totalPages === 'number') {
      nextUrl =
        pagination.currentPage < pagination.totalPages
          ? `${FLEETYARDS_API_BASE}/models?page=${pagination.currentPage + 1}&perPage=${PER_PAGE}`
          : undefined;
    } else {
      const linkHeader = response.headers.get('Link');
      const links = parseLinkHeader(linkHeader);

      if (links.next) {
        // Link header signals more pages. Only follow the URL if it points at
        // the trusted FleetYards models endpoint; otherwise construct the next
        // page URL from the trusted base.
        if (isValidNextUrl(links.next)) {
          nextUrl = links.next;
        } else {
          logger.warn('FleetYards Link rel=next URL failed origin validation, using trusted URL', {
            module: 'fleetyards',
            page,
            untrustedNextUrl: links.next,
          });
          nextUrl = `${FLEETYARDS_API_BASE}/models?page=${page + 1}&perPage=${PER_PAGE}`;
        }
      } else if (pageShips.length < PER_PAGE) {
        // Response smaller than page size -- this was the last page
        nextUrl = undefined;
      } else {
        // No Link header but full page -- construct next URL manually
        nextUrl = `${FLEETYARDS_API_BASE}/models?page=${page + 1}&perPage=${PER_PAGE}`;
      }
    }

    page++;

    // Delay between pages to respect rate limits
    if (nextUrl && page <= MAX_PAGES) {
      await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    }
  }

  if (page > MAX_PAGES) {
    const errorMsg = `Reached MAX_PAGES limit (${MAX_PAGES}) -- pagination stopped as safety measure`;
    errors.push(errorMsg);
    logger.warn('FleetYards reached MAX_PAGES limit', {
      module: 'fleetyards',
      maxPages: MAX_PAGES,
    });
  }

  logger.info('FleetYards fetch complete', {
    module: 'fleetyards',
    totalShips: allShips.length,
    pagesProcessed,
  });

  return { ships: allShips, pagesProcessed, errors };
}
