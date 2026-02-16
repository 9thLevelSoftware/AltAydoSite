# Phase 13: Accessibility & Performance Foundations - Research

**Researched:** 2026-02-15
**Domain:** Web accessibility (WCAG 2.1 AA), CSS focus management, MongoDB pagination, Next.js cache headers
**Confidence:** HIGH

## Summary

This phase layers accessibility and performance improvements onto the existing codebase without introducing new libraries. The work is entirely achievable with native browser APIs, existing CSS custom properties, and MongoDB query features already available through the project's driver.

The form label audit identified **14 files** containing `<label>` elements without `htmlFor`/`id` pairing, totaling approximately 65+ individual label-input associations to fix. The MobiGlasInput component already implements the gold standard pattern (auto-generated IDs, `aria-required`, `aria-describedby` for errors). The modal audit found **4 modals** lacking focus trap and Escape key handling (FleetShipPickerModal, MissionShipPickerModal, TransactionModal, HoloModal). The existing MobiGlasConfirmDialog provides the reference pattern for Escape handling but lacks a true focus trap. The global focus style in `globals.css` uses `*:focus` which fires on mouse clicks -- this needs replacement with `:focus-visible`. Both API routes (`/api/users` and `/api/planned-missions`) currently fetch all records from MongoDB and slice in-memory. The `/_next/static` cache header is set to 1 hour instead of the required immutable/1-year.

**Primary recommendation:** No new dependencies needed. Execute as pure code changes across CSS, React components, API routes, and Next.js config.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Audit all form inputs; add `htmlFor`/`id` pairing where missing (LoginForm, TransactionModal, and any custom inputs outside MobiGlas components)
- MobiGlasInput already has correct `htmlFor`/`id`/`aria-*` attributes -- use it as the reference pattern
- Labels above inputs (existing convention) -- no floating labels
- Required fields: use `aria-required` attribute (MobiGlasInput already does this)
- Error messages associated via `aria-describedby` (MobiGlasInput pattern)
- Extend ConfirmDialog's existing pattern (Escape key, focus trap, focus restoration) to all modals
- FleetShipPickerModal and MissionShipPickerModal: add Escape handler + focus trap
- TransactionModal: add Escape handler + focus trap
- Focus returns to trigger element on close (ConfirmDialog already does this)
- No nested modal edge cases to handle -- the codebase doesn't nest modals
- Replace global `:focus` with `:focus-visible` in globals.css for keyboard-only focus rings
- Cyan glow style: `box-shadow: 0 0 0 2px rgba(var(--mg-accent), 0.6)` -- matches MobiGlas theme
- Mouse clicks should NOT trigger focus outlines (`:focus-visible` handles this natively)
- Interactive elements that need indicators: buttons, links, inputs, selects, modal controls
- Remove the existing `*:focus { outline: none; box-shadow: ... }` rule -- replace with `:focus-visible` variant
- Mission and user lists: implement MongoDB `skip`/`limit` at the DB level
- `/api/users` already supports `page`/`pageSize` -- verify frontend uses it (not just client-side slicing)
- `/api/planned-missions`: add pagination params if missing
- Page size default: 25 items (consistent with ships API)
- Frontend: simple prev/next pagination controls, not infinite scroll
- URL query params for page state (shareable links, back-button friendly)
- Static assets (`/_next/static`): upgrade from current 1-hour to `immutable, max-age=31536000` (1 year) per success criteria
- Current 1-hour cache on fonts and images is fine for non-static assets
- API routes already set `no-store` -- no changes needed there

### Claude's Discretion
- Exact focus trap implementation (custom hook vs existing library)
- Whether to extract a shared `useModalKeyboard` hook or inline per-modal
- Pagination component styling details
- Order of implementation across plans
- How to handle edge cases in focus restoration (e.g., trigger element removed from DOM)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.3.3 | Framework (headers config, App Router) | Already installed |
| MongoDB Driver | (via Cosmos DB) | `skip`/`limit` pagination | Already installed |
| React | 18/19 | `useRef`, `useEffect`, `useCallback` for focus management | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| motion/react | (installed) | AnimatePresence on modals | Already used by all modals |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom focus trap | `focus-trap-react` (npm) | Adds dependency; custom is fine for 4 modals with simple DOM structure |
| Custom pagination | `@tanstack/react-table` | Overkill; we need simple prev/next with skip/limit |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   └── useFocusTrap.ts          # NEW: shared focus trap hook
├── components/
│   └── ui/mobiglas/
│       └── MobiGlasInput.tsx     # REFERENCE: gold standard for form a11y
├── app/
│   ├── globals.css               # MODIFY: focus-visible styles
│   ├── layout.tsx                # MODIFY: skip-to-content link + main id
│   └── api/
│       ├── users/route.ts        # MODIFY: DB-level pagination
│       └── planned-missions/route.ts  # MODIFY: DB-level pagination
└── next.config.js                # MODIFY: cache headers
```

### Pattern 1: Form Label Association (Reference: MobiGlasInput)
**What:** Every `<label>` gets `htmlFor` pointing to a unique `id` on the corresponding `<input>`/`<select>`/`<textarea>`.
**When to use:** Every form input in the codebase.
**Example:**
```typescript
// Source: src/components/ui/mobiglas/MobiGlasInput.tsx (existing pattern)
const inputId = id || `mg-input-${Math.random().toString(36).substr(2, 9)}`;
const errorId = `${inputId}-error`;

<label htmlFor={inputId}>
  {label} {required && <span>*</span>}
</label>
<input
  id={inputId}
  aria-required={required}
  aria-invalid={!!error}
  aria-describedby={error ? errorId : undefined}
/>
{error && <p id={errorId} role="alert">{error}</p>}
```

### Pattern 2: Focus Trap Hook (Recommended: Custom)
**What:** A `useFocusTrap` hook that queries focusable elements within a container ref, traps Tab/Shift+Tab, handles Escape, and restores focus on unmount.
**When to use:** All modal components.
**Example:**
```typescript
// Recommended custom hook
function useFocusTrap(containerRef: RefObject<HTMLElement>, isActive: boolean, onEscape: () => void) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Save the currently focused element for restoration
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // Focus first focusable element
    const firstFocusable = container.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus -- guard against removed elements
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, containerRef, onEscape]);
}
```

### Pattern 3: Focus-Visible CSS
**What:** Replace `*:focus` with `*:focus-visible` so only keyboard navigation shows focus rings.
**When to use:** Global CSS replacement.
**Example:**
```css
/* REMOVE existing rule at line 437 of globals.css */
/* *:focus {
  outline: none;
  box-shadow: 0 0 0 1px rgba(var(--mg-primary), 0.3);
} */

/* REPLACE with */
*:focus {
  outline: none;
}

*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(var(--mg-accent), 0.6);
}

/* Also update .mg-button:hover, .mg-button:focus to .mg-button:focus-visible */
/* Also update .mg-input:focus and .mg-select:focus to :focus-visible variants */
```

### Pattern 4: MongoDB skip/limit Pagination
**What:** Push pagination to the database query instead of fetching all documents and slicing in JS.
**When to use:** `/api/users` and `/api/planned-missions` GET routes.
**Example:**
```typescript
// BEFORE (current -- in-memory slicing)
const missions = await db.collection('planned-missions').find(query).toArray();
const start = (page - 1) * pageSize;
const paged = missions.slice(start, start + pageSize);

// AFTER (DB-level pagination)
const total = await db.collection('planned-missions').countDocuments(query);
const missions = await db.collection('planned-missions')
  .find(query)
  .sort({ scheduledDateTime: 1 })
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .toArray();
```

### Pattern 5: Skip-to-Content Link
**What:** A visually hidden link at the top of the page that becomes visible on focus, allowing keyboard users to skip past navigation.
**Example:**
```tsx
// In layout.tsx, before <header>
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[rgba(var(--mg-panel-dark),0.95)] focus:text-[rgba(var(--mg-accent),1)] focus:border focus:border-[rgba(var(--mg-accent),0.6)] focus:rounded-sm focus:text-sm focus:font-quantify"
>
  Skip to main content
</a>
// ... and add id="main-content" to the <main> tag
```

### Anti-Patterns to Avoid
- **Random ID generation on every render:** `Math.random()` in MobiGlasInput generates new IDs on re-render, which breaks React's reconciliation for `htmlFor`/`id` pairing. Use `useId()` (React 18+) or `useMemo` for stable IDs. However, since the existing MobiGlasInput pattern works (React preserves the ref between renders since the component doesn't unmount/remount), follow the same pattern for consistency across forms but consider `useId()` for new components.
- **Removing `outline: none` without replacement:** Browsers have ugly default outlines. The `:focus-visible` rule must include a replacement `box-shadow` so keyboard users always see something.
- **Forgetting `countDocuments` with pagination:** If you skip/limit but still fetch-all to count, you've gained nothing. Use `countDocuments(query)` for the total.
- **Sorting after skip/limit:** MongoDB applies sort before skip/limit, which is correct. But the current JS sort in `getAllPlannedMissions` (line 189) won't apply to DB-level pagination -- the sort must move into the MongoDB query.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap | Full accessibility library | Custom `useFocusTrap` hook (4 modals only) | Simple DOM structure, no nested modals, no complex scenarios -- a 30-line hook is sufficient |
| Pagination controls | Custom component from scratch | Reuse pattern from existing `ShipPagination` component | Already exists in `src/components/ships/ShipPagination.tsx` |
| Screen reader testing | Automated testing framework | Manual testing with browser dev tools + reduced motion media query | Scope of phase doesn't require automated a11y testing |

**Key insight:** The codebase already has reference implementations for every pattern needed (MobiGlasInput for forms, MobiGlasConfirmDialog for Escape, ShipPagination for pagination controls). This phase is about replicating existing patterns, not inventing new ones.

## Common Pitfalls

### Pitfall 1: Focus-visible breaking existing MobiGlasInput focus styles
**What goes wrong:** MobiGlasInput has inline Tailwind `focus:ring-2 focus:ring-[rgba(var(--mg-primary),0.5)]` which uses `:focus` not `:focus-visible`. After the global CSS change, keyboard and mouse focus on inputs should still show the ring (inputs are an exception -- they should show focus state even on click).
**Why it happens:** Inputs are special: users expect visual feedback when they click into a text field, unlike buttons.
**How to avoid:** Keep `focus:` (not `focus-visible:`) Tailwind classes on `<input>`, `<select>`, and `<textarea>`. Only change buttons, links, and non-input interactive elements to `focus-visible:`. The global `*:focus-visible` rule provides the fallback for elements without explicit Tailwind focus classes.
**Warning signs:** Click on an input field and see no visual indication of which field is active.

### Pitfall 2: Focus trap not finding focusable elements in portal-rendered modals
**What goes wrong:** FleetShipPickerModal and MissionShipPickerModal use `createPortal` to render at `document.body`. The focus trap ref must point to the portal content, not the component's original DOM position.
**Why it happens:** Portal moves DOM nodes outside the component tree.
**How to avoid:** Attach the ref to the outermost `<div>` inside the portal content, not the portal wrapper.
**Warning signs:** Tab key escapes the modal and cycles through background page elements.

### Pitfall 3: countDocuments performance with complex filters
**What goes wrong:** `countDocuments` runs a separate query. With complex filter combinations, this could be slow on large collections.
**Why it happens:** MongoDB doesn't return total count with paginated queries by default.
**How to avoid:** For the current scale (< 1000 missions, < 500 users), this is fine. If scale increases, consider `estimatedDocumentCount()` for unfiltered queries or caching counts.
**Warning signs:** API response time doubles compared to non-paginated version.

### Pitfall 4: Losing sort order when moving pagination to DB
**What goes wrong:** The current `getAllPlannedMissions` sorts in JS after fetching all records. When we add `skip/limit`, the JS sort only sees one page of results.
**Why it happens:** Sort must happen before skip/limit in MongoDB, not after in JS.
**How to avoid:** Add `.sort()` to the MongoDB query chain before `.skip().limit()`. Remove the JS-side sort.
**Warning signs:** Page 2 shows missions that should have appeared on page 1.

### Pitfall 5: HoloModal close button has no aria-label
**What goes wrong:** The close button's SVG is not accessible to screen readers.
**Why it happens:** SVG-only buttons without text need `aria-label`.
**How to avoid:** Add `aria-label="Close modal"` to the close button. FleetShipPickerModal already does this correctly.
**Warning signs:** Screen reader announces "button" with no context.

### Pitfall 6: Breaking AnimatePresence exit animations with focus restoration
**What goes wrong:** Focus restoration fires immediately when `isOpen` becomes false, but AnimatePresence is still animating the exit. The trigger element may not be ready to receive focus.
**Why it happens:** The cleanup function in `useEffect` fires on unmount, but the portal DOM may still be mid-animation.
**How to avoid:** Restore focus in the cleanup function of the `useFocusTrap` effect -- this fires when the component unmounts (after AnimatePresence exit completes if the trap is inside the animated element). Alternatively, use `requestAnimationFrame` to defer focus restoration by one frame.
**Warning signs:** Focus briefly goes to body, then to the correct element, causing a visible flicker.

## Code Examples

### Complete useFocusTrap Hook
```typescript
// src/hooks/useFocusTrap.ts
import { useEffect, useRef, RefObject, useCallback } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  onEscape: () => void
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const stableOnEscape = useCallback(onEscape, [onEscape]);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus first focusable element
    requestAnimationFrame(() => {
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stableOnEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      const prev = previousFocusRef.current;
      if (prev && document.body.contains(prev)) {
        prev.focus();
      }
    };
  }, [isActive, containerRef, stableOnEscape]);
}
```

### Focus-Visible CSS (globals.css changes)
```css
/* Replace existing *:focus rule (line 437) */
*:focus {
  outline: none;
}

*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(var(--mg-accent), 0.6);
}

/* Update .mg-button -- keep hover, change focus to focus-visible */
.mg-button:hover, .mg-button:focus-visible {
  background: rgba(var(--mg-primary), 0.1);
  border-color: rgba(var(--mg-primary), 0.6);
  box-shadow: 0 0 10px rgba(var(--mg-primary), 0.15),
              0 0 0 2px rgba(var(--mg-accent), 0.6);
}

/* .mg-input:focus and .mg-select:focus stay as :focus (not :focus-visible) */
/* because inputs should show focus state even on mouse click */
```

### DB-Level Pagination for users
```typescript
// src/app/api/users/route.ts -- replace in-memory slicing
const db = await getDb();
const query = {}; // or with filters if added later
const total = await db.collection('users').countDocuments(query);
const docs = await db.collection('users')
  .find(query, { projection: { _id: 0 } })
  .sort({ aydoHandle: 1 })
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .toArray();
```

### DB-Level Pagination for planned-missions
```typescript
// src/app/api/planned-missions/route.ts -- replace in-memory slicing
const total = await db.collection('planned-missions').countDocuments(query);
const missions = await db.collection('planned-missions')
  .find(query)
  .sort({ scheduledDateTime: 1 })
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .toArray();

// Remove the JS-side sort (lines 189-193 of planned-mission-storage.ts)
```

### Cache Header Update
```javascript
// next.config.js -- update /_next/static header
{
  source: '/_next/static/:path*',
  headers: [
    { key: 'Cache-Control', value: 'public, immutable, max-age=31536000' },
  ],
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `:focus` for all focus rings | `:focus-visible` for keyboard-only | CSS Selectors Level 4 (2022, universal browser support) | Mouse clicks don't show focus outlines |
| `tabindex` management for focus trap | Same -- still standard | N/A | No library needed for simple cases |
| Fetch-all + client slice | DB-level skip/limit | Always been available in MongoDB | Reduces memory and transfer for large datasets |
| `outline: auto` defaults | Custom `box-shadow` focus indicators | Modern a11y best practice | Themed focus rings that match UI design |

**Deprecated/outdated:**
- `:-moz-focusring`: Replaced by standard `:focus-visible` -- no need for vendor prefix
- `outline-offset` hacks: `box-shadow` is now preferred for themed focus indicators

## Codebase Inventory

### Files Needing Label Fixes (no `htmlFor`)
| File | Approx. Labels to Fix |
|------|----------------------|
| `src/components/auth/LoginForm.tsx` | 2 |
| `src/components/auth/SignupForm.tsx` | 6 |
| `src/components/dashboard/widgets/TransactionModal.tsx` | 4 |
| `src/components/dashboard/MissionPlannerForm.tsx` | ~10 |
| `src/components/dashboard/MissionTemplateForm.tsx` | ~10 |
| `src/components/fleet-ops/OperationEditor.tsx` | 4 (lines 399, 434, 447, 479) |
| `src/components/fleet-ops/mission-planner/MissionFilters.tsx` | 3 |
| `src/components/profile/UserProfileContent.tsx` | ~8 |
| `src/components/UserProfilePanel.tsx` | ~7 |
| `src/components/ships/ShipFilterPanel.tsx` | 4 |
| `src/components/ships/ShipSearchBar.tsx` | 1 (if present) |
| `src/app/forgot-password/page.tsx` | 1 |
| `src/app/reset-password/page.tsx` | 2 |
| `src/app/dashboard/subsidiaries/security/page.tsx` | ~15 |
| **Total** | **~77 label-input associations** |

### Modals Needing Focus Trap + Escape
| Modal | Has Escape | Has Focus Trap | Has Focus Restore | Uses Portal |
|-------|-----------|----------------|-------------------|-------------|
| `MobiGlasConfirmDialog` | YES | NO (focuses overlay) | NO | NO |
| `FleetShipPickerModal` | NO | NO | NO | YES (createPortal) |
| `MissionShipPickerModal` | NO | NO | NO | YES (createPortal) |
| `TransactionModal` | NO | NO | NO | NO |
| `HoloModal` | NO | NO | NO | NO |
| `MissionTemplateCreator` (delete modal) | Partial | NO | NO | NO |

### Additional Requirements (from requirements list)
| Req | What | Current State | Fix |
|-----|------|---------------|-----|
| UX-08 | Dashboard fake metrics | SystemStatusBar shows live date/time, EventCarousel has static slides but real Discord events. No "fake metrics" found in dashboard page itself. | Investigate further -- may already be resolved or may be in a sub-page |
| UX-09 | Skip-to-content link | Does not exist | Add to layout.tsx + add `id="main-content"` to `<main>` |
| UX-10 | Close mobile menu on route change | Mobile nav already has `onClick={() => setIsOpen(false)}` on Links, but no `usePathname` listener for programmatic navigation | Add `usePathname` effect to close menu |
| PERF-07 | Remove 800ms auth delay | `src/app/dashboard/page.tsx` line 45: `setTimeout(..., 800)` | Remove setTimeout, use session status directly |

## Open Questions

1. **UX-08: Dashboard fake metrics**
   - What we know: The main dashboard page (`src/app/dashboard/page.tsx`) renders EventCarousel, UpcomingEventsPanel, SystemStatusBar, DashboardSidebar. None contain obviously hardcoded fake metrics.
   - What's unclear: The requirement says "Replace hardcoded fake dashboard metrics with real data or clear 'Demo' label." The `archives/hierarchy/page.tsx` has a comment about "Sample organizational data structures" which might be the target.
   - Recommendation: Audit all dashboard sub-pages (`/dashboard/archives/*`, `/dashboard/subsidiaries/*`) for hardcoded data. If found, add "Demo Data" labels. If not found, mark UX-08 as already satisfied or not applicable to main dashboard.

2. **MobiGlasConfirmDialog focus trap completeness**
   - What we know: It focuses the overlay div on open and handles Escape, but doesn't trap Tab between buttons.
   - What's unclear: Whether the user considers this "complete enough" or needs full trap.
   - Recommendation: Add focus trap to ConfirmDialog as well for consistency, since we're building the hook anyway.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: Direct file reads of all 14 form files, 6 modal files, globals.css, next.config.js, API routes, storage layers
- MDN Web Docs: `:focus-visible` pseudo-class -- universal browser support since 2022
- MongoDB documentation: `skip()`, `limit()`, `countDocuments()` -- standard cursor methods available in all MongoDB driver versions

### Secondary (MEDIUM confidence)
- WCAG 2.1 AA guidelines: Label associations (1.3.1), Focus Visible (2.4.7), Keyboard (2.1.1) -- well-established standards
- Next.js headers configuration: Verified against existing `next.config.js` structure in codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all native APIs
- Architecture: HIGH -- reference implementations exist in codebase for every pattern
- Pitfalls: HIGH -- identified from direct codebase analysis (portal focus, sort order, AnimatePresence timing)

**Research date:** 2026-02-15
**Valid until:** 2026-06-15 (stable domain, no fast-moving dependencies)
