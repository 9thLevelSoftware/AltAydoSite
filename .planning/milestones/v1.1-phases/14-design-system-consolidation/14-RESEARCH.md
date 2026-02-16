# Phase 14: Design System Consolidation - Research

**Researched:** 2026-02-15
**Domain:** Design system unification, component consolidation, UX consistency
**Confidence:** HIGH

## Summary

This phase consolidates the MobiGlas design system into the single source of truth for buttons, corner accents, auth forms, error display, and loading states. The codebase currently has 3 button implementations, 4+ corner accent patterns, hand-rolled auth form styling, inconsistent error display, and missing loading states on some async actions.

The good news: the MobiGlas design system already has well-built components (`MobiGlasButton`, `CornerAccents`, `MobiGlasPanel`, `MobiGlasInput`, `MobiGlasToast`) that cover all required use cases. This is primarily a migration/consolidation effort, not a build-from-scratch effort. Phase 13 already completed DS-07 (focus-visible), and Phase 11 already built the toast notification system needed for DS-05's system-level tier.

**Primary recommendation:** Systematically replace inline patterns with existing MobiGlas components, add missing variants to MobiGlasButton where needed (e.g., `success` variant), and wire up `isLoading` on the remaining async actions.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion/react | v12 | Animation for button states, toast notifications | Already in use project-wide (Phase 12 migration complete) |
| React | 19 | Component framework | Already in use |
| Tailwind CSS | 4 | Utility styling | Already in use |
| Next.js | 15.3.3 | Framework | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| MobiGlasButton | N/A (internal) | All button rendering | Replace HolographicButton + raw mg-button CSS |
| CornerAccents | N/A (internal) | All corner accent rendering | Replace 4+ inline patterns |
| MobiGlasInput/TextArea | N/A (internal) | Form inputs with built-in error display | Auth form migration |
| MobiGlasToast + useToast | N/A (internal) | System-level notifications | DS-05 tier 3 |
| MobiGlasPanel | N/A (internal) | Panel containers with built-in corners | Already handles corners natively |

### Alternatives Considered
No new libraries needed. This is purely internal consolidation.

**Installation:**
```bash
# No new dependencies required
```

## Architecture Patterns

### Current MobiGlas Design System Structure
```
src/components/ui/mobiglas/
  CornerAccents.tsx        # Standalone corner component (3 variants: simple/detailed/animated)
  MobiGlasButton.tsx       # Primary button (6 variants, loading state, corner support)
  MobiGlasConfirmDialog.tsx
  MobiGlasContainer.tsx
  MobiGlasInput.tsx        # Input + TextArea with built-in error display + corner accents
  MobiGlasPagination.tsx
  MobiGlasPanel.tsx        # Panel with built-in corner accents + configurable size/color
  MobiGlasToast.tsx        # Toast notification (4 types: success/error/info/warning)
  MobiGlasToastProvider.tsx # Context provider for toast system
  ScanlineEffect.tsx
  StatusIndicator.tsx
  DataStreamBackground.tsx
  HolographicBorder.tsx
  index.ts                 # Barrel exports
```

### Pattern 1: Button Consolidation (DS-02)

**Current state - THREE button implementations:**

1. **`MobiGlasButton`** (48 usages) - The design system component. Variants: primary, secondary, accent, danger, ghost, outline. Has `isLoading`, `leftIcon`, `rightIcon`, `withCorners`, `withScanline`, `withGlow`.

2. **`HolographicButton`** (3 usages in MissionDashboard.tsx) - Standalone component at `src/components/fleet-ops/mission-planner/HolographicButton.tsx`. Variants: primary, secondary, danger, success. Has elaborate hover effects (scanning line, corner decorations, glow). Missing: `isLoading`. Used ONLY in MissionDashboard for "Create Mission" buttons.

3. **Raw `.mg-button` CSS class** (~23 usages in TSX files) - Direct use of CSS class on `<button>` or `<motion.button>` elements. Found in: LoginForm, SignupForm, Footer, HomeContent, HeroSection, ContactForm, FinanceTrackerClient, AuthError, ReferencePageContent, services page, recruitment page. Also undeclared variants: `mg-button-primary` and `mg-button-danger` (used in OperationDetailView but have NO CSS definition - this is a pre-existing bug).

**Migration strategy:**
- `HolographicButton` -> `MobiGlasButton` with `withCorners + withScanline + withGlow` (only 3 call sites, simple replacement)
- Raw `mg-button` CSS -> `MobiGlasButton` component with appropriate variant (23 call sites, more work)
- Add `success` variant to MobiGlasButton (needed for HolographicButton's success variant)
- Fix `mg-button-primary` / `mg-button-danger` in OperationDetailView (undefined CSS classes - pre-existing bug)

**Critical CSS issue (DS-08):** `.mg-button` in globals.css line 128 uses `background: rgba(var(--mg-dark), 0.5) !important;` - the `!important` prevents MobiGlasButton variant overrides. Must remove `!important` once all raw `.mg-button` usages are migrated, or change MobiGlasButton to not rely on `.mg-button` class.

### Pattern 2: Corner Accent Consolidation (DS-03)

**Current state - FOUR+ inline corner patterns:**

| Pattern | Size | Files | Count |
|---------|------|-------|-------|
| `w-[6px] h-[6px]` small accents | xs | LoginForm, SignupForm, MobiGlasInput, ShipSearchBar, reset-password, forgot-password | ~14 |
| `w-5 h-5` medium accents | md | LoginForm, SignupForm, Footer, HomeContent, UserProfileContent, reset-password, forgot-password | ~12 |
| `w-[15px] h-[15px]` with 2px bars | md-alt | ErrorNotification, MissionDetail, HolographicButton | ~8 |
| `w-[20px] h-[20px]` with 2px bars | lg | MissionCard, MissionDashboard, MissionFilters, OperationCard, MissionDetail | ~10 |

**Plus the formal components:**
- `CornerAccents` component: Used in 3 files (TemplateStrip, MissionTemplateCreator, ServicesHero)
- `MobiGlasPanel` built-in corners: Used in many files via cornerAccents prop (sm/md/lg sizes)
- `MobiGlasButton` built-in corners: via `withCorners` prop

**Migration strategy:**
- Inline patterns in standalone elements -> Use `CornerAccents` component with appropriate size/variant
- Inline patterns on panels already using `MobiGlasPanel` -> Use built-in `cornerAccents` prop (likely already active)
- Inline patterns on inputs -> Already handled by `MobiGlasInput` component (has corner accents built in)
- For the 2px bar style (w-[15px], w-[20px]): May need a new `bar` variant on CornerAccents, OR convert those components to use MobiGlasPanel

### Pattern 3: Auth Form Migration (DS-04)

**Current state:** LoginForm and SignupForm use raw HTML inputs with inline Tailwind styling, raw `mg-button` CSS class for submit buttons, and hand-rolled corner accents.

**What MobiGlas provides:**
- `MobiGlasInput` - Input with label, error display, corner accents, accessibility (aria-invalid, aria-describedby)
- `MobiGlasTextArea` - Same but for textareas
- `MobiGlasButton` - Submit buttons with loading state
- `MobiGlasPanel` - Wrapping container with corners
- `CornerAccents` - If needed standalone

**Migration path:**
1. Replace hand-rolled inputs with `MobiGlasInput` (automatically gets corner accents + error display)
2. Replace raw `mg-button` submit buttons with `MobiGlasButton` (gets loading spinner)
3. Replace corner bracket divs with `CornerAccents` or `MobiGlasPanel` wrapper
4. Preserve Discord OAuth button styling (unique one-off, use MobiGlasButton with custom className)
5. Preserve password match indicator in SignupForm (custom logic, keep inline)

### Pattern 4: Error Display Unification (DS-05)

**Current state - Error display is inconsistent across the app:**

| Tier | Current Implementation | Components Using It |
|------|----------------------|---------------------|
| Field-level inline | `MobiGlasInput` has `error` prop with animated `<p role="alert">` | Only used where MobiGlasInput is used |
| Form-level banner | Hand-rolled per-form (LoginForm, SignupForm, security page all different styling) | 6+ forms |
| System-level toast | `MobiGlasToast` + `useToast()` hook (built in Phase 11) | MissionPlanner, ResetProfileComponent, useUserProfile |
| Legacy notification | `ErrorNotification` component (fixed position, own corner accents) | Standalone usage |

**Target 3-tier system:**
1. **Field-level inline**: Already solved by `MobiGlasInput.error` prop. Migrate auth forms to use it.
2. **Form-level banner**: Create a `MobiGlasFormError` component (or standardize pattern). Consistent styling: error icon + message + optional details, using MobiGlas palette variables.
3. **System-level toast**: Already solved by `useToast()`. Wire up to more async actions. `ErrorNotification` should be deprecated in favor of toast.

### Pattern 5: MissionCard Status Colors (DS-06)

**Current state:** `MissionCard.tsx` uses hardcoded Tailwind colors for status badges:
- Planning: `border-blue-400 text-blue-400 bg-[rgba(59,130,246,0.1)]`
- Briefing: `border-purple-400 text-purple-400`
- In Progress: `border-green-400 text-green-400`
- Completed: `border-gray-400 text-gray-400`
- Archived: `border-gray-500 text-gray-500`
- Cancelled: `border-red-400 text-red-400`

**Target:** Use MobiGlas CSS variables:
- Planning: `--mg-primary` (cyan)
- Briefing: `--mg-accent` (bright cyan) or `--mg-secondary` (blue)
- In Progress: `--mg-success` (green)
- Completed: `--mg-text` with reduced opacity
- Archived: `--mg-text` with further reduced opacity
- Cancelled: `--mg-danger` (red)

### Pattern 6: Loading States (UX-07)

**Current state of high-frequency async actions:**

| Action | File | Has Loading State? | Uses MobiGlasButton? |
|--------|------|-------------------|---------------------|
| Mission create | MissionPlannerForm.tsx | YES (isLoading + MobiGlasButton.isLoading) | YES |
| Profile save | UserProfileContent.tsx | YES (isSaving + MobiGlasButton.isLoading) | YES |
| Escort submit | security/page.tsx | PARTIAL (isSubmitting + text change, NO spinner) | NO (raw mg-button) |
| Operation save | OperationEditor.tsx | YES (isSubmitting + MobiGlasButton.isLoading) | YES |
| Contact form | ContactForm.tsx | Has isLoading but uses raw button | NO |
| Login submit | LoginForm.tsx | YES (text change + scanner-line, NO spinner) | NO (raw mg-button) |
| Signup submit | SignupForm.tsx | YES (text change + scanner-line, NO spinner) | NO (raw mg-button) |

**Actions needing work:**
- Escort submit: Convert to MobiGlasButton with isLoading
- Contact form: Convert to MobiGlasButton with isLoading
- Login/Signup: Will be handled by DS-04 auth form migration

### Pattern 7: DS-07 Focus-Visible (ALREADY COMPLETE)

Phase 13-01 already migrated `*:focus` to `*:focus-visible` in globals.css. Verified:
- Line 441: `*:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(var(--mg-accent), 0.6); }`
- `.mg-button:hover, .mg-button:focus-visible` (line 140) - already correct
- No remaining `*:focus` (non-visible) rules found

**DS-07 is DONE. No work needed.**

### Anti-Patterns to Avoid
- **Replacing buttons one-at-a-time in a component that has multiple**: Always migrate ALL buttons in a component in one pass to avoid mixed styling
- **Removing .mg-button CSS before all usages are migrated**: The CSS class is used by both raw HTML buttons and MobiGlasButton component itself - MobiGlasButton applies `mg-button` class in its variant styles
- **Breaking the !important removal (DS-08) too early**: Must remove `!important` from `.mg-button` AFTER migrating raw usages, not before, or raw usages will break
- **Over-engineering CornerAccents**: The existing component + MobiGlasPanel built-in corners handle 90% of cases. Don't add 10 new variants for edge cases

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Button with loading spinner | Custom spinner div | `MobiGlasButton` with `isLoading` prop | Already built with motion animation |
| Corner accents on panels | Inline border divs | `MobiGlasPanel cornerAccents` prop or `CornerAccents` component | Already supports 3 sizes + 5 colors |
| Form input with error | Inline error `<p>` tags | `MobiGlasInput error` prop | Has animation, aria-invalid, aria-describedby |
| Toast notifications | Fixed-position error divs | `useToast()` hook | Has auto-dismiss, stacking, animation |
| Confirm dialogs | window.confirm() | `MobiGlasConfirmDialog` | Already built in Phase 11 |

**Key insight:** The MobiGlas design system already has components for every consolidation target. This phase is about USING them consistently, not building new things.

## Common Pitfalls

### Pitfall 1: MobiGlasButton extends MotionProps, not ButtonHTMLAttributes
**What goes wrong:** Trying to pass standard HTML button attributes like `aria-label`, `name`, `form` etc.
**Why it happens:** MobiGlasButton extends `Omit<MotionProps, 'children'>`, not `React.ButtonHTMLAttributes`
**How to avoid:** Check if MobiGlasButton needs its type signature widened before starting migration. Some raw `mg-button` usages pass HTML attributes that MobiGlasButton doesn't accept.
**Warning signs:** TypeScript errors when replacing `<button className="mg-button" aria-label="...">` with `<MobiGlasButton>`

### Pitfall 2: MobiGlasButton applies mg-button CSS class in primary variant
**What goes wrong:** Removing `!important` from `.mg-button` CSS before understanding that MobiGlasButton primary variant uses the `mg-button` class string
**Why it happens:** Line 41 of MobiGlasButton.tsx: `primary: 'mg-button border border-[...]'` - the component class includes `mg-button`
**How to avoid:** When removing `!important` from `.mg-button` background, verify that MobiGlasButton's Tailwind classes properly override the CSS class background
**Warning signs:** All MobiGlasButton primary variants suddenly get the wrong background color

### Pitfall 3: CornerAccents component renders fragments, not wrappers
**What goes wrong:** Using `<CornerAccents>` without a `position: relative` parent container
**Why it happens:** CornerAccents renders `<div className="absolute ...">` elements - they need a positioned parent
**How to avoid:** Always ensure the parent element has `relative` (or `MobiGlasPanel` which already has it)
**Warning signs:** Corner accents floating to the viewport edge instead of the component edge

### Pitfall 4: Auth forms have security-critical redirect logic
**What goes wrong:** Breaking the `isValidCallbackUrl` function or session management during refactor
**Why it happens:** LoginForm has complex redirect logic, callback URL validation, session update flow
**How to avoid:** Only modify the PRESENTATION layer (inputs, buttons, error display). Do not touch `handleSubmit`, `isValidCallbackUrl`, session management, or redirect logic
**Warning signs:** Open redirect vulnerabilities, broken login flow

### Pitfall 5: mg-button-primary and mg-button-danger have NO CSS definitions
**What goes wrong:** OperationDetailView buttons using undefined CSS classes render with no styling
**Why it happens:** These classes were likely planned but never defined, or were removed during a refactor
**How to avoid:** Replace these with `MobiGlasButton` components, don't try to add CSS for them
**Warning signs:** Unstyled buttons in the fleet-ops operation detail view

### Pitfall 6: HolographicButton has a success variant that MobiGlasButton lacks
**What goes wrong:** Replacing HolographicButton success variant with MobiGlasButton and losing the green color scheme
**Why it happens:** MobiGlasButton has primary/secondary/accent/danger/ghost/outline but no `success`
**How to avoid:** Add a `success` variant to MobiGlasButton before migrating HolographicButton
**Warning signs:** Green buttons becoming cyan after migration

## Code Examples

### Replacing raw mg-button with MobiGlasButton
```typescript
// BEFORE (raw CSS class)
<motion.button
  type="submit"
  className={`mg-button w-full py-2 px-4 relative overflow-hidden ${isLoading ? 'opacity-80' : ''}`}
  disabled={isLoading}
  whileTap={{ scale: 0.98 }}
>
  {isLoading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
</motion.button>

// AFTER (MobiGlasButton)
<MobiGlasButton
  type="submit"
  variant="primary"
  fullWidth
  disabled={isLoading}
  isLoading={isLoading}
>
  ACCESS SYSTEM
</MobiGlasButton>
```

### Replacing inline corner accents with CornerAccents
```typescript
// BEFORE (inline)
<div className="relative">
  <div className="absolute top-0 left-0 w-5 h-5 border-l border-t border-[rgba(var(--mg-primary),0.5)]"></div>
  <div className="absolute top-0 right-0 w-5 h-5 border-r border-t border-[rgba(var(--mg-primary),0.5)]"></div>
  <div className="absolute bottom-0 left-0 w-5 h-5 border-l border-b border-[rgba(var(--mg-primary),0.5)]"></div>
  <div className="absolute bottom-0 right-0 w-5 h-5 border-r border-b border-[rgba(var(--mg-primary),0.5)]"></div>
  {content}
</div>

// AFTER (CornerAccents component)
<div className="relative">
  <CornerAccents size="md" color="primary" opacity="medium" />
  {content}
</div>
```

### Replacing inline input with MobiGlasInput
```typescript
// BEFORE (inline)
<div className="mg-input-group mb-4">
  <label htmlFor="login-handle" className="mg-subtitle text-xs mb-1 block tracking-wider">AYDOCORP HANDLE</label>
  <div className="relative">
    <input
      type="text"
      id="login-handle"
      className="mg-input w-full bg-[rgba(var(--mg-panel-dark),0.5)] border ..."
      placeholder="ENTER HANDLE"
    />
    <div className="absolute top-0 left-0 w-[6px] h-[6px] border-l border-t ..."></div>
  </div>
</div>

// AFTER (MobiGlasInput)
<MobiGlasInput
  label="AYDOCORP HANDLE"
  id="login-handle"
  type="text"
  placeholder="ENTER HANDLE"
  required
  autoComplete="username"
  value={aydoHandle}
  onChange={(e) => setAydoHandle(e.target.value)}
  error={fieldErrors?.aydoHandle}
/>
```

### MissionCard status colors with MobiGlas variables
```typescript
// BEFORE
case 'Planning':
  return 'border-blue-400 text-blue-400 bg-[rgba(59,130,246,0.1)]';
case 'Cancelled':
  return 'border-red-400 text-red-400 bg-[rgba(248,113,113,0.1)]';

// AFTER
case 'Planning':
  return 'border-[rgba(var(--mg-primary),0.5)] text-[rgba(var(--mg-primary),0.8)] bg-[rgba(var(--mg-primary),0.1)]';
case 'Cancelled':
  return 'border-[rgba(var(--mg-danger),0.5)] text-[rgba(var(--mg-danger),0.8)] bg-[rgba(var(--mg-danger),0.1)]';
```

### Adding loading state to escort submit
```typescript
// BEFORE (raw button with text-only loading)
<button
  type="submit"
  disabled={isSubmitting}
  className={`mg-button px-6 py-2 bg-[rgba(255,100,100,0.2)] ...`}
>
  {isSubmitting ? 'Submitting...' : 'Submit Escort Request'}
</button>

// AFTER (MobiGlasButton with spinner)
<MobiGlasButton
  type="submit"
  variant="danger"
  disabled={isSubmitting}
  isLoading={isSubmitting}
>
  Submit Escort Request
</MobiGlasButton>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw `.mg-button` CSS class | `MobiGlasButton` component | Phase 5-6 (component created) | Component not yet universally adopted |
| Inline corner accent divs | `CornerAccents` component + `MobiGlasPanel` corners | Phase 5-6 | Only 3 files use CornerAccents, panels use built-in |
| `*:focus` styling | `*:focus-visible` styling | Phase 13 | COMPLETE - no further work |
| `ErrorNotification` component | `useToast()` + `MobiGlasToast` | Phase 11 | Toast system exists but not widely adopted |
| Mixed error display patterns | 3-tier error system | This phase (14) | Not yet implemented |

**Deprecated/outdated:**
- `HolographicButton`: Should be replaced by `MobiGlasButton` with enhanced props
- `ErrorNotification`: Should be replaced by `useToast()` system-level notifications
- Raw `mg-button` CSS on HTML buttons: Should be replaced by `MobiGlasButton` component
- `mg-button-primary`/`mg-button-danger` CSS classes: Never defined, should be replaced with component usage
- `mg-button-small` CSS class: Should be replaced by `MobiGlasButton size="sm"`

## Pre-Existing Issues Found

1. **`mg-button-primary` and `mg-button-danger` CSS classes used but never defined** - OperationDetailView.tsx uses these classes (5 usages) but they have no CSS definition in globals.css. These buttons are effectively unstyled beyond browser defaults.

2. **`mg-button-secondary` CSS exists but overlaps with MobiGlasButton `secondary` variant** - globals.css defines `.mg-button-secondary` (line 1131) with different styling than MobiGlasButton's secondary variant. Used in OperationDetailView.

3. **MobiGlasButton lacks `success` variant** - HolographicButton has success (green), MobiGlasButton does not. Need to add before migration.

4. **MobiGlasButton onClick type is `() => void`** - Some button click handlers need the event object `(e: React.MouseEvent)`. May need to widen the type.

5. **`.mg-button` background `!important`** - Line 128 in globals.css. This overrides Tailwind-based variant backgrounds in MobiGlasButton when the `mg-button` class is applied.

## Open Questions

1. **Should MobiGlasButton stop using the `mg-button` CSS class?**
   - What we know: MobiGlasButton primary/secondary/accent/danger variants all include `mg-button` in their className string. The CSS `.mg-button` sets `background: ... !important` which fights with Tailwind variant backgrounds.
   - What's unclear: Is the `mg-button` CSS providing essential base styles (font, tracking, transition) that MobiGlasButton needs, or can MobiGlasButton be self-contained?
   - Recommendation: Extract needed base styles into MobiGlasButton's own classes, remove `mg-button` from variant strings, then safely remove `!important`. This is the cleanest approach for DS-08.

2. **What happens to the `.mg-button` CSS class after migration?**
   - What we know: After all raw usages are migrated to MobiGlasButton, the CSS class has no external consumers
   - What's unclear: Are there any dynamic/server-rendered content that uses the class?
   - Recommendation: Keep the CSS class but remove `!important`. It may still be useful as a utility class. Don't delete it.

3. **CornerAccents bar variant needed?**
   - What we know: MissionCard and similar components use `w-[2px] h-[10px]` bars at corners, which is visually different from border-based corners
   - What's unclear: Should these remain as-is (they're visually distinct and may be intentional) or consolidate?
   - Recommendation: Add a `bar` variant to CornerAccents for the 2px bar style, but this is lower priority. MobiGlasPanel handles most cases.

4. **Form-level error banner component needed?**
   - What we know: DS-05 defines 3 tiers. Tier 1 (field) and tier 3 (toast) exist. Tier 2 (form-level banner) is hand-rolled differently in each form.
   - What's unclear: Should this be a new `MobiGlasFormError` component, or just a documented pattern?
   - Recommendation: Create a small `MobiGlasFormError` component that standardizes the error banner pattern (icon + message + motion animation). Used by LoginForm, SignupForm, security page, ContactForm, etc.

## Suggested Plan Breakdown

| Plan | Scope | Files | Risk |
|------|-------|-------|------|
| 14-01 | MobiGlasButton enhancements: add success variant, widen onClick type, prepare for DS-08 | MobiGlasButton.tsx, globals.css | LOW |
| 14-02 | Button consolidation: Replace HolographicButton + raw mg-button in fleet-ops | MissionDashboard, OperationDetailView, OperationCard + delete HolographicButton.tsx | MEDIUM |
| 14-03 | Button consolidation: Replace raw mg-button in public pages | Footer, HomeContent, HeroSection, services, recruitment, ContactForm, FinanceTracker, AuthError, ReferencePageContent | MEDIUM |
| 14-04 | Auth form migration: LoginForm + SignupForm to MobiGlas components | LoginForm.tsx, SignupForm.tsx | MEDIUM-HIGH (security-critical) |
| 14-05 | Corner accent consolidation + MissionCard status colors | Multiple files (~15), MissionCard.tsx | LOW-MEDIUM |
| 14-06 | Error display unification: Create MobiGlasFormError, wire up 3-tier system | New component + 6+ form files | MEDIUM |
| 14-07 | Loading states + cleanup: Wire isLoading to remaining async actions, remove deprecated code | security/page.tsx, ContactForm.tsx + cleanup | LOW |

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all 13 MobiGlas design system components
- Direct codebase analysis of all button, corner accent, error display, and loading state patterns
- globals.css CSS class definitions and variable declarations

### Secondary (MEDIUM confidence)
- Phase 11 verification document (toast system completion)
- Phase 13 verification document (focus-visible completion)
- Phase 12 verification document (motion/react migration)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed, all internal components exist
- Architecture: HIGH - Direct codebase inspection of all relevant files
- Pitfalls: HIGH - Identified specific code-level gotchas with line numbers
- Migration scope: HIGH - Complete file counts and usage patterns documented

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable - internal components, no external dependency changes expected)
