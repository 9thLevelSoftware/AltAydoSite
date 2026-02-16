# Phase 15: Code Quality & Optimization - Research

**Researched:** 2026-02-15
**Domain:** Structured logging, state machines, optimistic locking, Next.js SSR, canvas performance, image lazy-loading
**Confidence:** HIGH

## Summary

Phase 15 covers eight distinct requirements spanning four domains: logging (QUAL-01), data integrity (QUAL-02, QUAL-03), metadata/SEO (QUAL-05), and frontend performance (PERF-04, PERF-05, PERF-06, PERF-08). The codebase already has strong foundations for several of these -- a structured `Logger` class exists but is unused (925 console.* calls across 99 files), a mission status state machine exists for planned missions but not for legacy missions, and optimistic locking is implemented for users but not for any other storage module.

The performance work is straightforward: the home page is a client component using `useSession()` and can be converted to a server component with `getServerSession()`; the starfield canvas runs at uncapped frame rate via raw `requestAnimationFrame`; the carousel loads all 8 images eagerly; and the About page re-renders the entire tree every second due to a timer in the page-level component.

**Primary recommendation:** Tackle this in 8 plans (one per requirement) with QUAL-01 (logging) being the largest effort (~78 server-side files + ~21 client-side files). Group by domain for efficient execution.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `src/lib/logger.ts` | (existing) | Structured logging singleton | Already built, just unused. Has severity levels, JSON output in production, API logging helper |
| Next.js App Router | 15.5.12 | SSR, metadata API, server components | Already in use; `generateMetadata()` and `getServerSession()` are built-in patterns |
| MongoDB `$inc` + filter | (native) | Optimistic locking via `__v` field | Already proven in `user-storage.ts`; atomic compare-and-increment |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next-auth` | (existing) | `getServerSession()` for server-side auth | PERF-04: Replace client-side `useSession()` on home page |
| `motion/react` | v12 (existing) | AnimatePresence for carousel transitions | Already in EventCarousel -- no new dependencies needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom Logger class | pino / winston | Overkill for this project size; existing Logger is adequate and already built |
| Manual `__v` locking | Mongoose with versionKey | Project doesn't use Mongoose; raw MongoDB driver with manual `__v` is the established pattern |
| Custom state machine | xstate | Massive overhead for a simple status enum; inline transition map is cleaner |

**Installation:** No new dependencies needed. All requirements use existing libraries.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── logger.ts              # Already exists -- singleton structured Logger
│   ├── state-machines/
│   │   └── mission-status.ts  # Extract status transition logic (reusable)
│   ├── user-storage.ts        # Already has optimistic locking (template)
│   ├── planned-mission-storage.ts  # Needs __v support added
│   ├── operation-storage.ts        # Needs __v support added
│   ├── mission-storage.ts          # Needs __v support added
│   ├── resource-storage.ts         # Needs __v support added
│   └── ...
├── app/
│   ├── page.tsx               # Convert to server component
│   ├── metadata.ts            # Already exists -- extend pattern to child routes
│   └── [route]/
│       └── page.tsx           # Add metadata exports
└── components/
    ├── Starfield.tsx           # Add 30fps cap
    ├── dashboard/EventCarousel.tsx  # Fix lazy loading
    └── about/AboutHero.tsx     # Move timer here from page
```

### Pattern 1: Logger Replacement (QUAL-01)
**What:** Replace `console.log/warn/error` with `logger.info/warn/error` across all server-side files
**When to use:** Every `.ts` file in `src/lib/` and `src/app/api/`
**Example:**
```typescript
// BEFORE
console.log('STORAGE: [MongoDB] Getting user by ID:', id);
console.error('STORAGE: [MongoDB] getUserById failed:', error);

// AFTER
import { logger } from '@/lib/logger';
logger.info('Getting user by ID', { storage: 'MongoDB', userId: id });
logger.error('getUserById failed', error instanceof Error ? error : new Error(String(error)), { storage: 'MongoDB' });
```

**Client-side consideration:** The Logger class uses `process.env.NODE_ENV` which isn't available in client components. Client-side console calls in `.tsx` components should be:
- **ErrorBoundary/error handlers:** Keep `console.error` (these are genuine browser-side error reporting)
- **Debug logging in components:** Replace with `if (process.env.NODE_ENV === 'development') console.log(...)` or remove entirely
- **The requirement says "server-side logging"** -- focus on `src/lib/` and `src/app/api/` files (78 files, 833 occurrences)

### Pattern 2: Status State Machine (QUAL-02)
**What:** The planned missions status route already has a `STATUS_TRANSITIONS` map (see `src/app/api/planned-missions/[id]/status/route.ts` lines 95-102). Extract this pattern and apply to legacy `Mission` type too.
**When to use:** Any API route that changes mission/operation status
**Existing implementation (PlannedMission):**
```typescript
const STATUS_TRANSITIONS: Record<PlannedMissionStatus, PlannedMissionStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['ACTIVE', 'CANCELLED', 'DRAFT'],
  ACTIVE: ['DEBRIEFING', 'COMPLETED', 'CANCELLED'],
  DEBRIEFING: ['COMPLETED', 'ACTIVE'],
  COMPLETED: [],
  CANCELLED: ['DRAFT']
};
```
**Needed for legacy Mission type:**
```typescript
// src/types/Mission.ts defines: 'Planning' | 'Briefing' | 'In Progress' | 'Debriefing' | 'Completed' | 'Archived' | 'Cancelled'
const MISSION_STATUS_TRANSITIONS: Record<MissionStatus, MissionStatus[]> = {
  'Planning': ['Briefing', 'Cancelled'],
  'Briefing': ['In Progress', 'Planning', 'Cancelled'],
  'In Progress': ['Debriefing', 'Completed', 'Cancelled'],
  'Debriefing': ['Completed', 'In Progress'],
  'Completed': ['Archived'],
  'Archived': [],
  'Cancelled': ['Planning']
};
```

### Pattern 3: Optimistic Locking Extension (QUAL-03)
**What:** Replicate the `user-storage.ts` `__v` pattern to other storage modules
**When to use:** Any storage module with `update*()` functions
**Existing pattern from `user-storage.ts`:**
```typescript
export async function updateUser(id: string, userData: Partial<User>, expectedVersion?: number): Promise<User | null> {
  // Build version filter
  if (expectedVersion !== undefined) {
    if (expectedVersion === 0) {
      versionFilter.$or = [{ __v: 0 }, { __v: { $exists: false } }];
    } else {
      versionFilter.__v = expectedVersion;
    }
  }
  // Atomic update with $inc
  const result = await collection.findOneAndUpdate(
    { id, ...versionFilter },
    { $set: updateFields, $inc: { __v: 1 } },
    { returnDocument: 'after' }
  );
  // If no match and version was provided, throw StaleDocumentError
  if (!result && expectedVersion !== undefined) {
    const exists = await collection.findOne({ id });
    if (exists) throw new StaleDocumentError(collection, id);
  }
}
```
**Storage modules needing this pattern:**
- `planned-mission-storage.ts` (46 console calls, heaviest usage -- missions edited by multiple leaders)
- `operation-storage.ts` (34 console calls)
- `mission-storage.ts` (34 console calls)
- `resource-storage.ts` (56 console calls)
- `escort-request-storage.ts` (28 console calls)
- `mission-template-storage.ts` (36 console calls)

### Pattern 4: Home Page Server Component (PERF-04)
**What:** Convert `src/app/page.tsx` from client component to server component
**Current state:** Uses `"use client"` + `useSession()` hook to check auth, passes `isLoggedIn` prop to `HomeContent`
**Target state:**
```typescript
// src/app/page.tsx -- NO "use client"
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth';
import HomeContent from '@/components/HomeContent';

export default async function Home() {
  const session = await getServerSession(authOptions);
  return (
    <div className="container mx-auto px-4 py-12">
      <HomeContent isLoggedIn={!!session} userName={session?.user?.name || ''} />
    </div>
  );
}
```
**Note:** `HomeContent` is already a client component (`"use client"`) so it will hydrate normally. The page wrapper just becomes a server component.

### Pattern 5: Canvas FPS Cap (PERF-05)
**What:** Add timestamp-based frame skipping to the starfield animation loop
**Current:** Uses raw `requestAnimationFrame(animate)` with no throttling (runs at 60fps+)
**Target:**
```typescript
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
let lastFrameTime = 0;

const animate = (timestamp: number) => {
  animationFrameId = requestAnimationFrame(animate);

  const elapsed = timestamp - lastFrameTime;
  if (elapsed < FRAME_INTERVAL) return;
  lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);

  // ... existing draw calls
};
requestAnimationFrame(animate);
```

### Pattern 6: Carousel Lazy Loading (PERF-06)
**What:** Only set `priority` on current slide, let Next.js `Image` default to lazy for others
**Current state:** `priority={currentIndex === 0}` -- only first slide is priority, BUT all 8 `<Image>` components are mounted via AnimatePresence (actually only current + exiting are mounted due to `mode="sync"`)
**Issue:** The carousel uses AnimatePresence which only renders the current slide + the exiting slide. So only 1-2 images are mounted at any time. The real fix is to preload the NEXT image:
```typescript
// Preload next image using a hidden Image or link[rel=preload]
const nextIndex = (currentIndex + 1) % images.length;
<Image src={images[currentIndex].src} priority /> {/* current */}
<link rel="preload" as="image" href={images[nextIndex].src} /> {/* next */}
```

### Pattern 7: About Page Timer Isolation (PERF-08)
**What:** Move the 1-second `setInterval` from `src/app/about/page.tsx` into `AboutHero` component only
**Current state:** `about/page.tsx` has `setTime(new Date())` every 1000ms at line 21-24, causing full tree re-render (DataFeedSection, HistorySection, DirectivesSection, JoinCTASection, AboutTabs all re-render)
**Target:** `AboutHero` manages its own `time` state internally. Remove `time` prop from `AboutHeroProps`.

### Anti-Patterns to Avoid
- **Logging in client components with server Logger:** The `Logger` class uses `process.env` -- don't import it in `"use client"` files
- **Breaking backward compat on `expectedVersion`:** Keep it optional (Phase 8 made it optional for gradual rollout)
- **Adding `__v` to local storage fallback:** The fallback JSON storage doesn't need atomic operations -- skip version checks when `usingFallback`
- **Removing ALL console.* from client code:** Error boundaries and auth error handlers legitimately need `console.error` in the browser

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured logging | Custom log parser | Existing `Logger` class in `src/lib/logger.ts` | Already built with severity, JSON, timestamps, API helper |
| State machine library | xstate integration | Inline `Record<Status, Status[]>` transition map | Already proven pattern in planned-missions status route |
| Version conflict detection | Custom diffing | MongoDB `findOneAndUpdate` with `__v` filter | Atomic operation, no race conditions, proven in user-storage |
| Image preloading | Custom fetch/cache | `<link rel="preload">` or Next.js `Image` with `priority` | Browser-native, zero JS overhead |
| FPS throttling | Custom timer | `requestAnimationFrame` + timestamp delta | Standard canvas pattern, no drift |

**Key insight:** Every pattern needed for Phase 15 already exists somewhere in the codebase. The work is extension and replication, not invention.

## Common Pitfalls

### Pitfall 1: Logger Import in Client Components
**What goes wrong:** Importing `logger` from `@/lib/logger` in a `"use client"` component causes build errors or runtime issues because `process.env.NODE_ENV` behaves differently client-side.
**Why it happens:** The Logger class was designed for server-side use.
**How to avoid:** Only replace console calls in `src/lib/` and `src/app/api/` files. For client components, either keep console calls or use a simpler client-safe wrapper.
**Warning signs:** Build warnings about `process` usage in client bundles.

### Pitfall 2: Breaking Optimistic Locking Backward Compat
**What goes wrong:** Making `expectedVersion` required breaks all existing API callers that don't send it.
**Why it happens:** Rushing to enforce version checking before all clients are updated.
**How to avoid:** Keep `expectedVersion` as optional parameter (exactly as user-storage does). Skip version check when undefined. Gradually update clients to send `__v`.
**Warning signs:** 400/409 errors on save operations after deployment.

### Pitfall 3: Metadata Export Conflicts with "use client"
**What goes wrong:** Adding `export const metadata` to a page that has `"use client"` causes Next.js to ignore the metadata (metadata exports only work in server components).
**Why it happens:** Many dashboard pages are client components.
**How to avoid:** Use `layout.tsx` files for metadata when the page is a client component. Or move metadata to the nearest server component ancestor.
**Warning signs:** Browser tab still showing generic title after adding metadata export.

### Pitfall 4: Starfield FPS Cap Breaking Animation Smoothness
**What goes wrong:** Naive frame skipping causes jerky animation or accumulating drift.
**Why it happens:** Using `setInterval` instead of timestamp-based `requestAnimationFrame` throttling.
**How to avoid:** Use the `elapsed % FRAME_INTERVAL` remainder technique to prevent drift. Always use `requestAnimationFrame` as the timing source.
**Warning signs:** Animation appears to stutter or speed up/slow down.

### Pitfall 5: About Page Timer Removal Breaking DataFeedSection
**What goes wrong:** Other components besides AboutHero may depend on the `time` prop or `scrollPosition`.
**Why it happens:** Not auditing all consumers of the timer state.
**How to avoid:** Check which components actually USE `time` as a prop. Currently only `AboutHero` receives `time`. `scrollPosition` is used by AboutHero only. Both can be moved into AboutHero.
**Warning signs:** Components stop updating or animating after refactor.

### Pitfall 6: Carousel "Lazy Loading" When Only One Image Is Mounted
**What goes wrong:** Adding `loading="lazy"` to an image that's the only mounted image does nothing -- it loads immediately anyway.
**Why it happens:** AnimatePresence only renders the active slide (+ exiting during transition). There's no off-screen image to lazy-load.
**How to avoid:** The real optimization is preloading the NEXT slide (not lazy-loading off-screen ones). Use `<link rel="preload">` for the next slide's image.
**Warning signs:** No measurable performance difference after "fix".

## Code Examples

### Logger Usage Pattern (server-side)
```typescript
// src/lib/some-storage.ts
import { logger } from '@/lib/logger';

export async function getSomething(id: string) {
  logger.info('Fetching resource', { collection: 'something', id });
  try {
    const db = await getDb();
    const result = await db.collection('something').findOne({ id });
    return result;
  } catch (error) {
    logger.error('Failed to fetch resource', error instanceof Error ? error : new Error(String(error)), {
      collection: 'something',
      id
    });
    throw error;
  }
}
```

### Optimistic Locking Template (for non-user storage modules)
```typescript
// Template for adding to planned-mission-storage.ts, operation-storage.ts, etc.
import { StaleDocumentError } from '@/lib/user-storage'; // Reuse existing error class

export async function updatePlannedMission(
  id: string,
  missionData: Partial<PlannedMissionResponse>,
  expectedVersion?: number
): Promise<PlannedMissionResponse | null> {
  const db = await getDb();
  const collection = db.collection('planned_missions');

  const versionFilter: any = {};
  if (expectedVersion !== undefined) {
    if (expectedVersion === 0) {
      versionFilter.$or = [{ __v: 0 }, { __v: { $exists: false } }];
    } else {
      versionFilter.__v = expectedVersion;
    }
  }

  const { id: _id, __v: _v, ...updateFields } = missionData as any;

  const result = await collection.findOneAndUpdate(
    { id, ...versionFilter },
    {
      $set: { ...updateFields, updatedAt: new Date().toISOString() },
      $inc: { __v: 1 }
    },
    { returnDocument: 'after', projection: { _id: 0 } }
  );

  if (!result && expectedVersion !== undefined) {
    const exists = await collection.findOne({ id });
    if (exists) throw new StaleDocumentError('planned_missions', id);
  }

  return result as unknown as PlannedMissionResponse | null;
}
```

### Next.js Metadata for Client Component Pages
```typescript
// For pages that must remain "use client", add metadata in their layout.tsx
// src/app/about/layout.tsx (new file)
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | AydoCorp',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

### 30fps Canvas Cap
```typescript
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS; // ~33.33ms
let lastFrameTime = 0;

const animate = (timestamp: number) => {
  animationFrameId = requestAnimationFrame(animate);

  const elapsed = timestamp - lastFrameTime;
  if (elapsed < FRAME_INTERVAL) return; // Skip this frame

  // Prevent drift by adjusting for overshoot
  lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();
  drawNebulas();
  drawGridLines();
  drawDataStreams();
  drawHexGlows();
  drawHologramCircles();
  drawFocusPoints();
};

// Start with timestamp parameter
requestAnimationFrame(animate);
```

## Codebase Audit Results

### QUAL-01: Console.* Usage Inventory
- **Server-side (.ts files):** 833 occurrences across 78 files
- **Client-side (.tsx files):** 92 occurrences across 21 files
- **Heaviest files:** `resource-storage.ts` (56), `planned-mission-storage.ts` (46), `mission-template-storage.ts` (36), `operation-storage.ts` (34), `mission-storage.ts` (34), `user-storage.ts` (30)
- **Scripts (can keep console):** `src/scripts/` has ~168 occurrences across 7 files -- these are CLI tools, console is appropriate
- **Logger exists but unused:** `src/lib/logger.ts` is fully implemented with singleton `logger` export

### QUAL-02: Mission Status Audit
- **PlannedMission:** Already has STATUS_TRANSITIONS map in `src/app/api/planned-missions/[id]/status/route.ts` (lines 95-102) with validation. DONE.
- **Legacy Mission:** `src/types/Mission.ts` defines `MissionStatus` type but NO transition validation exists. The fleet-ops missions route (`src/app/api/fleet-ops/missions/route.ts`) allows any status to be set.
- **Action needed:** Add transition map for legacy `MissionStatus` type and enforce in fleet-ops missions API route.

### QUAL-03: Optimistic Locking Audit
- **user-storage.ts:** Has `__v`, `StaleDocumentError`, `expectedVersion` parameter. COMPLETE.
- **planned-mission-storage.ts:** NO `__v`, no version checking. Needs it (multiple leaders edit missions).
- **operation-storage.ts:** NO `__v`. Needs it (operations edited by fleet commanders).
- **mission-storage.ts:** NO `__v`. Needs it.
- **resource-storage.ts:** NO `__v`. Needs it (resource allocations edited concurrently).
- **escort-request-storage.ts:** NO `__v`. Lower priority but should get it for consistency.
- **mission-template-storage.ts:** NO `__v`. Lower priority (templates less contentious).

### QUAL-05: Metadata Audit
**Pages with metadata:**
- Root layout: via `src/app/metadata.ts` (title: "Aydo Intergalactic Corporation...")
- Dashboard layout: `src/app/dashboard/layout.tsx`
- Admin layout: `src/app/admin/layout.tsx`
- User profile layout: `src/app/userprofile/layout.tsx`
- References page: `src/app/references/page.tsx`

**Pages WITHOUT unique metadata (33 total pages, ~28 missing):**
- `src/app/about/page.tsx` -- "use client", needs layout.tsx
- `src/app/contact/page.tsx`
- `src/app/join/page.tsx`
- `src/app/join/recruitment-info/page.tsx`
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/services/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`
- `src/app/reset-profile/page.tsx`
- `src/app/debug-profile/page.tsx`
- All dashboard child pages (events, finance-tracker, fleet-composition, fleet-database, mission-planner, mission-templates, operations/fleet, subsidiaries/*, archives/*, career/*)

### PERF-04: Home Page Server Component
- **Current:** `src/app/page.tsx` is `"use client"` with `useSession()` hook
- **Fix:** Replace with `getServerSession(authOptions)` in async server component
- **Risk:** LOW -- `HomeContent` is already a separate client component, page wrapper is trivial

### PERF-05: Starfield FPS
- **Current:** `src/components/Starfield.tsx` uses `requestAnimationFrame(animate)` with no throttling
- **Animation loop:** Line 554-567, calls 7 draw functions per frame at 60fps+
- **Fix:** Add timestamp-based frame skipping to cap at 30fps

### PERF-06: Carousel Lazy Loading
- **Current:** `src/components/dashboard/EventCarousel.tsx` uses `AnimatePresence mode="sync"` -- only 1-2 slides mounted at a time
- **Current priority:** `priority={currentIndex === 0}` at line 260
- **Fix:** Set `priority` on current slide only (not just index 0), and preload next slide via `<link rel="preload">`

### PERF-08: About Page Timer
- **Current:** `src/app/about/page.tsx` line 21-24: `setInterval(() => setTime(new Date()), 1000)` at page level
- **`time` prop used by:** Only `AboutHero` (line 74: `<AboutHero time={time} .../>`)
- **`scrollPosition` used by:** Only `AboutHero` (line 75)
- **Fix:** Move both `time` and `scrollPosition` state + effects into `AboutHero`. Remove props. This stops 6 child components from re-rendering every second.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `console.log` everywhere | Structured logging with severity levels | Industry standard | Log aggregation, filtering, alerting in production |
| No version checking on writes | Optimistic locking with `__v` field | MongoDB best practice | Prevents silent data loss from concurrent edits |
| Client-side session checking | Server-side `getServerSession()` | Next.js 13+ (2023) | Faster initial render, no loading flash, better SEO |
| `requestAnimationFrame` uncapped | Timestamp-based frame skipping | Standard canvas pattern | 50% CPU reduction for background animations |
| Next.js `metadata` object | Same, but per-route | Next.js 13+ App Router | Each page gets unique browser tab title |

## Open Questions

1. **Should `src/scripts/` files be converted to use Logger?**
   - What we know: Scripts are CLI tools run manually, console output is conventional for CLI
   - What's unclear: Whether the requirement "zero console.log calls in production code" includes scripts
   - Recommendation: Exclude `src/scripts/` from QUAL-01 scope -- they're dev tools, not production code

2. **Should StaleDocumentError be moved to a shared module?**
   - What we know: Currently defined in `user-storage.ts`, but QUAL-03 needs it in 5+ other modules
   - What's unclear: Whether importing from user-storage creates unwanted coupling
   - Recommendation: Extract to `src/lib/errors.ts` or `src/lib/storage-errors.ts` for shared use

3. **How should client-side console calls be handled?**
   - What we know: 92 occurrences across 21 .tsx files; Logger can't run client-side
   - What's unclear: Whether requirement covers client-side too
   - Recommendation: Focus on server-side (the requirement says "server-side logging uses structured Logger"). For client-side, remove debug logs and keep only error boundary console.error calls.

4. **Metadata for deeply nested dashboard pages**
   - What we know: Dashboard has a layout with metadata, but child pages don't override it
   - What's unclear: Whether each dashboard sub-page needs its own title or if "Dashboard | AydoCorp" suffices
   - Recommendation: Each page should have a unique title for multi-tab distinction (e.g., "Mission Planner | AydoCorp", "Finance Tracker | AydoCorp"). This is explicitly called out in the success criteria.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all files mentioned above
- `src/lib/logger.ts` -- existing Logger implementation verified
- `src/lib/user-storage.ts` -- existing optimistic locking pattern verified
- `src/app/api/planned-missions/[id]/status/route.ts` -- existing state machine verified
- `src/app/page.tsx` -- current client component structure verified
- `src/components/Starfield.tsx` -- current animation loop verified (no FPS cap)
- `src/components/dashboard/EventCarousel.tsx` -- current image loading verified
- `src/app/about/page.tsx` -- timer re-render issue verified

### Secondary (MEDIUM confidence)
- Next.js App Router metadata API -- well-documented, standard pattern
- Canvas requestAnimationFrame throttling -- standard web platform technique
- MongoDB optimistic locking with `__v` -- established MongoDB pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all patterns already exist in the codebase, just need extension
- Architecture: HIGH -- no new architectural decisions, just replication of proven patterns
- Pitfalls: HIGH -- identified from direct code analysis, not speculation

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable domain, no fast-moving dependencies)
