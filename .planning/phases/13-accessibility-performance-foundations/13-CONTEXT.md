# Phase 13: Accessibility & Performance Foundations - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Forms become screen-reader accessible with proper label associations, modals trap focus and respond to keyboard, keyboard focus gets a visible cyan glow that doesn't trigger on mouse clicks, and performance bottlenecks in pagination and caching are eliminated. This phase does NOT add new UI components or redesign existing ones — it layers accessibility and performance onto the existing interface.

</domain>

<decisions>
## Implementation Decisions

### Form label strategy
- Audit all form inputs; add `htmlFor`/`id` pairing where missing (LoginForm, TransactionModal, and any custom inputs outside MobiGlas components)
- MobiGlasInput already has correct `htmlFor`/`id`/`aria-*` attributes — use it as the reference pattern
- Labels above inputs (existing convention) — no floating labels
- Required fields: use `aria-required` attribute (MobiGlasInput already does this)
- Error messages associated via `aria-describedby` (MobiGlasInput pattern)

### Modal keyboard behavior
- Extend ConfirmDialog's existing pattern (Escape key, focus trap, focus restoration) to all modals
- FleetShipPickerModal and MissionShipPickerModal: add Escape handler + focus trap
- TransactionModal: add Escape handler + focus trap
- Focus returns to trigger element on close (ConfirmDialog already does this)
- No nested modal edge cases to handle — the codebase doesn't nest modals

### Focus indicators
- Replace global `:focus` with `:focus-visible` in globals.css for keyboard-only focus rings
- Cyan glow style: `box-shadow: 0 0 0 2px rgba(var(--mg-accent), 0.6)` — matches MobiGlas theme
- Mouse clicks should NOT trigger focus outlines (`:focus-visible` handles this natively)
- Interactive elements that need indicators: buttons, links, inputs, selects, modal controls
- Remove the existing `*:focus { outline: none; box-shadow: ... }` rule — replace with `:focus-visible` variant

### Pagination
- Mission and user lists: implement MongoDB `skip`/`limit` at the DB level
- `/api/users` already supports `page`/`pageSize` — verify frontend uses it (not just client-side slicing)
- `/api/planned-missions`: add pagination params if missing
- Page size default: 25 items (consistent with ships API)
- Frontend: simple prev/next pagination controls, not infinite scroll
- URL query params for page state (shareable links, back-button friendly)

### Cache headers
- Static assets (`/_next/static`): upgrade from current 1-hour to `immutable, max-age=31536000` (1 year) per success criteria
- Current 1-hour cache on fonts and images is fine for non-static assets
- API routes already set `no-store` — no changes needed there

### Claude's Discretion
- Exact focus trap implementation (custom hook vs existing library)
- Whether to extract a shared `useModalKeyboard` hook or inline per-modal
- Pagination component styling details
- Order of implementation across plans
- How to handle edge cases in focus restoration (e.g., trigger element removed from DOM)

</decisions>

<specifics>
## Specific Ideas

- MobiGlasInput is the gold standard for form accessibility in this codebase — replicate its pattern everywhere
- ConfirmDialog is the gold standard for modal keyboard behavior — replicate its pattern everywhere
- The cyan glow focus indicator should feel like part of the MobiGlas HUD aesthetic, not a browser default

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-accessibility-performance-foundations*
*Context gathered: 2026-02-15*
