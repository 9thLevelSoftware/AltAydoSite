# Phase 11: UX Critical Fixes - Research

**Researched:** 2026-02-15
**Domain:** Client-side profile persistence, toast notifications, confirmation dialogs
**Confidence:** HIGH

## Summary

Phase 11 addresses three UX gaps: (1) user profile data stored in `localStorage` must persist server-side so it survives browser clearing and cross-device login, (2) all `alert()`/`confirm()` calls must be replaced with themed MobiGlas toast notifications, and (3) destructive actions need confirmation dialogs before executing.

The codebase already has strong precedent patterns for all three requirements. The `MissionTemplateCreator` component already implements both a custom notification system (fixed-position toast with auto-dismiss) and a confirmation dialog using `MobiGlasPanel`/`MobiGlasButton`. The profile API (`/api/profile`) already supports server-side storage with optimistic locking (`__v`). The main work is: (a) migrating `useUserProfile` hook from localStorage to the existing profile API, (b) building a reusable toast system from the existing inline pattern, (c) building a reusable confirmation dialog from the existing inline pattern, and (d) replacing 8 `alert()` calls and 1 `confirm()` call in `MissionPlanner.tsx`.

**Primary recommendation:** Build two reusable MobiGlas UI components (toast provider + confirmation dialog), then wire them into existing components. No new libraries needed -- use `framer-motion` (already installed) for animations and React Context for the toast system.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| framer-motion | ^10.16.4 | Animation for toasts and dialogs | Already installed, used throughout codebase |
| React Context | built-in | Toast notification state management | No external dependency; sufficient for app-wide toasts |
| Next.js App Router | 15.3.3 | Profile API routes | Already in use for `/api/profile` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| MobiGlasPanel | local | Confirmation dialog container | Wrap dialog content |
| MobiGlasButton | local | Dialog action buttons | Confirm/Cancel actions |
| AnimatePresence | framer-motion | Enter/exit animations | Toast and dialog transitions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom toast (React Context) | sonner or react-hot-toast | External dep adds bundle size; custom approach matches existing MobiGlas theme perfectly and follows precedent in MissionTemplateCreator |
| Custom confirmation dialog | HTML `<dialog>` element | `<dialog>` is native but harder to style with MobiGlas theme; existing codebase already uses framer-motion modals |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── ui/
│       └── mobiglas/
│           ├── MobiGlasToast.tsx          # Toast notification component
│           ├── MobiGlasToastProvider.tsx   # Context provider + container
│           ├── MobiGlasConfirmDialog.tsx   # Reusable confirmation dialog
│           └── index.ts                    # Export new components
├── hooks/
│   ├── useToast.ts                        # Hook to trigger toasts
│   └── useUserProfile.ts                  # MODIFIED: server-first, localStorage fallback
└── app/
    └── layout.tsx                         # Add ToastProvider here
```

### Pattern 1: Toast Notification System (React Context)
**What:** A context-based toast system that queues notifications, auto-dismisses them, and renders them in a fixed portal position.
**When to use:** Replacing all `alert()` calls site-wide.
**Example:**
```typescript
// Source: Existing pattern in MissionTemplateCreator.tsx lines 66-69, 559-586
// Generalized into a reusable context

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number; // ms, default 5000
}

// Provider wraps the app in layout.tsx
<MobiGlasToastProvider>
  {children}
</MobiGlasToastProvider>

// Usage in any component
const { toast } = useToast();
toast.success('Mission published to Discord!');
toast.error('Failed to save attendance');
toast.info('Profile updated');
```

### Pattern 2: Confirmation Dialog (Promise-based)
**What:** A reusable confirmation dialog that returns a Promise, allowing `await confirm()` semantics.
**When to use:** Replacing `confirm()` calls and adding new destructive-action guards.
**Example:**
```typescript
// Source: Existing pattern in MissionTemplateCreator.tsx lines 505-558
// Generalized with promise resolution

const { confirm } = useConfirmDialog();

const handleDelete = async (id: string) => {
  const confirmed = await confirm({
    title: 'Confirm Deletion',
    message: 'Are you sure you want to delete this mission? This action cannot be undone.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    variant: 'danger'
  });
  if (!confirmed) return;
  // proceed with deletion
};
```

### Pattern 3: Server-First Profile with localStorage Fallback
**What:** Modify `useUserProfile` to load from `/api/profile` first, fall back to localStorage only when unauthenticated or API fails.
**When to use:** UX-01 profile persistence.
**Example:**
```typescript
// Load: API first, localStorage fallback
useEffect(() => {
  if (!session?.user) return;

  fetch('/api/profile')
    .then(res => res.json())
    .then(data => setProfile(mergeWithDefaults(data)))
    .catch(() => {
      // Fall back to localStorage
      const saved = localStorage.getItem(profileKey);
      if (saved) setProfile(JSON.parse(saved));
    });
}, [session]);

// Save: API first, localStorage as write-through cache
const updateProfile = async (updates) => {
  setProfile(prev => ({ ...prev, ...updates }));
  try {
    await fetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch {
    // localStorage write-through already happened via state effect
  }
};
```

### Anti-Patterns to Avoid
- **Inline notification state per component:** Don't duplicate the `notification` state + `useEffect` auto-dismiss pattern in every component. Extract it once into the toast provider.
- **Blocking confirm() replacement with synchronous pattern:** Don't try to make the custom dialog synchronous. Use async/await with Promise resolution.
- **Two-way localStorage sync:** Don't try to keep localStorage and server in perfect sync. Server is source of truth; localStorage is write-through cache for offline resilience only.
- **Migrating old UserProfile type fields to server:** The `UserProfile` type (from `useUserProfile.ts`) has `subsidiary`, `payGrade`, `preferredGameplayLoops` which partially overlap with server `User` type fields (`division`, `payGrade`). Don't create a new migration -- align the hook to use the existing server `User` schema fields.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast auto-dismiss timing | Manual setTimeout per component | Single useEffect in ToastProvider | Race conditions, memory leaks from unmounted components |
| Unique toast IDs | Math.random() | crypto.randomUUID() | Collision-free, built into browsers |
| Portal rendering for toasts | Manual DOM manipulation | React createPortal or fixed-position div in layout | Z-index stacking, SSR compatibility |
| Dialog focus trap | Manual keyboard handling | onKeyDown + useRef for focus management | Accessibility requires trapping Tab key within dialog |

**Key insight:** The MissionTemplateCreator already solved both problems (notification + delete confirm) inline. This phase extracts those solutions into reusable components and applies them everywhere.

## Common Pitfalls

### Pitfall 1: Type Schema Mismatch Between UserProfile and User
**What goes wrong:** The localStorage `UserProfile` type has fields (`subsidiary`, `preferredGameplayLoops`, `name`, `handle`) that don't exist on the server `User` type. Blindly POSTing the old localStorage shape to the profile API will fail validation.
**Why it happens:** `UserProfile` was designed for localStorage-only storage. The server `User` type uses different field names (`division` instead of `subsidiary`).
**How to avoid:** Map fields explicitly when migrating: `subsidiary` -> `division`, drop `preferredGameplayLoops` (or add to server schema if needed), `name` is derived from session.
**Warning signs:** 400 errors from profile API validation, fields silently dropped.

### Pitfall 2: Race Condition on Profile Save
**What goes wrong:** User edits profile, optimistic UI updates state, but API save fails (409 conflict from optimistic locking). UI shows stale data.
**Why it happens:** The profile API uses `__v` for optimistic locking. If another tab or session modified the profile, the version will be stale.
**How to avoid:** On 409 response, re-fetch profile from server, show toast "Profile was modified elsewhere -- refreshed", and let user re-apply changes.
**Warning signs:** 409 responses in console, lost edits.

### Pitfall 3: Toast Stacking and Z-Index Wars
**What goes wrong:** Toasts render behind modals or overlapping each other.
**Why it happens:** Fixed-position toasts at z-50 conflict with modal overlays at z-50.
**How to avoid:** Use z-[9999] for toasts (already used in MissionTemplateCreator), stack toasts vertically with gap.
**Warning signs:** Toasts invisible when modal is open.

### Pitfall 4: Duplicate UserProfilePanel vs UserProfileContent
**What goes wrong:** Both `UserProfilePanel` (uses `useUserProfile` localStorage hook) and `UserProfileContent` (uses direct API fetch) exist. Modifying only one leaves the other broken.
**Why it happens:** `UserProfilePanel` appears to be an older implementation. `UserProfileContent` is the active one used on `/userprofile` page.
**How to avoid:** Audit both components. `UserProfilePanel` may need to be deprecated or updated. Currently `UserProfileContent` fetches directly from API and does NOT use `useUserProfile` at all -- it has its own fetch logic.
**Warning signs:** Editing profile in one component doesn't reflect in the other.

### Pitfall 5: Missing Confirmation on Ship Removal in Fleet Builder
**What goes wrong:** Removing a ship from the fleet in `UserFleetBuilder` immediately removes it without confirmation. Since ships now persist server-side, accidental removal is more consequential.
**Why it happens:** The remove button directly calls `onRemoveShip(index)` with no guard.
**How to avoid:** Wrap the `onRemoveShip` call with the new confirmation dialog.
**Warning signs:** Users accidentally removing ships with no undo.

## Code Examples

Verified patterns from the existing codebase:

### Existing Inline Toast Pattern (MissionTemplateCreator)
```typescript
// Source: src/components/dashboard/MissionTemplateCreator.tsx lines 66-69, 559-586
const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

// Auto-dismiss
useEffect(() => {
  if (!notification) return;
  const timer = setTimeout(() => setNotification(null), 5000);
  return () => clearTimeout(timer);
}, [notification]);

// Usage
setNotification({ type: 'success', message: 'Template saved!' });

// Render (fixed position, z-[9999])
<motion.div
  className="fixed top-20 right-6 z-[9999]"
  initial={{ opacity: 0, x: 100, scale: 0.8 }}
  animate={{ opacity: 1, x: 0, scale: 1 }}
  exit={{ opacity: 0, x: 100, scale: 0.8 }}
>
  {/* ... styled notification ... */}
</motion.div>
```

### Existing Inline Confirmation Dialog (MissionTemplateCreator)
```typescript
// Source: src/components/dashboard/MissionTemplateCreator.tsx lines 505-558
const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

<motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
  <MobiGlasPanel variant="darker" cornerAccents={true} padding="lg"
    className="border-[rgba(var(--mg-danger),0.5)]">
    <h3>Confirm Deletion</h3>
    <p>Are you sure you want to delete this mission template?</p>
    <MobiGlasButton variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</MobiGlasButton>
    <MobiGlasButton variant="primary" onClick={() => handleDelete(showDeleteConfirm)}
      className="!bg-[rgba(var(--mg-danger),0.8)]">Delete</MobiGlasButton>
  </MobiGlasPanel>
</motion.div>
```

### Profile API (Already Supports Full Profile CRUD)
```typescript
// Source: src/app/api/profile/route.ts
// GET /api/profile - returns user data including ships, timezone, division, etc.
// PUT /api/profile - updates profile with optimistic locking via __v
// Supports both full profile updates and ships-only updates
```

### MobiGlas Design System Colors
```css
/* Source: src/app/globals.css */
--mg-primary: 0, 215, 255;      /* Cyan blue */
--mg-warning: 255, 180, 0;      /* Amber */
--mg-danger: 255, 70, 70;       /* Red */
--mg-success: 20, 255, 170;     /* Green */
--mg-error: 255, 70, 70;        /* Red (alias of danger) */
--mg-panel-dark: 0, 12, 24;     /* Dark background */
```

## Inventory of Changes Required

### UX-01: localStorage to Server-Side Storage

**Files with profile-related localStorage usage:**
| File | localStorage Usage | Action |
|------|-------------------|--------|
| `src/hooks/useUserProfile.ts` | Read/write full profile | Rewrite to use `/api/profile` API with localStorage fallback |
| `src/components/UserProfilePanel.tsx` | Uses `useUserProfile` hook | Update to use modified hook (or deprecate in favor of UserProfileContent) |
| `src/components/UserFleetBuilderWrapper.tsx` | Read/write ships to localStorage + API | Remove localStorage code, keep API-only (already has API path) |
| `src/components/profile/ResetProfileComponent.tsx` | Clears all localStorage profile keys | Update to call profile API reset endpoint |
| `src/app/debug-profile/page.tsx` | Reads all localStorage keys | Update to fetch from API instead |

**Files with NON-profile localStorage (leave alone):**
| File | Usage | Action |
|------|-------|--------|
| `src/lib/errorReporting.ts` | Error log storage | Keep as-is (client-only concern) |
| `src/components/auth/LoginForm.tsx` | Login animation flag | Keep as-is (UI state) |
| `src/components/HomeContent.tsx` | Footer hide flag, login animation | Keep as-is (UI state) |
| `src/components/Footer.tsx` | Footer hide preference | Keep as-is (UI state) |

**Schema gap -- fields in UserProfile but NOT in server User type:**
| UserProfile Field | Server User Field | Resolution |
|-------------------|-------------------|------------|
| `name` | Derived from session (`aydoHandle`) | Drop from stored profile |
| `handle` | `aydoHandle` | Map to aydoHandle |
| `subsidiary` | `division` | Map subsidiary -> division |
| `preferredGameplayLoops` | (missing) | Add to User type + DB schema + profile API |
| `photo` | `photo` | Already aligned |
| `payGrade` | `payGrade` | Already aligned |
| `position` | `position` | Already aligned |
| `timezone` | `timezone` | Already aligned |
| `ships` | `ships` | Already aligned |

### UX-02: Replace alert()/confirm() Calls

**Complete inventory of browser dialog calls:**
| File | Line | Call | Replacement |
|------|------|------|-------------|
| `MissionPlanner.tsx` | 355 | `alert('Mission published to Discord successfully!')` | `toast.success(...)` |
| `MissionPlanner.tsx` | 358 | `alert('Failed to publish: ...')` | `toast.error(...)` |
| `MissionPlanner.tsx` | 361 | `alert('Network error. Please try again.')` | `toast.error(...)` |
| `MissionPlanner.tsx` | 443 | `alert('Attendance saved successfully!')` | `toast.success(...)` |
| `MissionPlanner.tsx` | 446 | `alert('Failed to save attendance: ...')` | `toast.error(...)` |
| `MissionPlanner.tsx` | 449 | `alert('Network error. Please try again.')` | `toast.error(...)` |
| `MissionPlanner.tsx` | 471 | `alert('Mission marked as completed!')` | `toast.success(...)` |
| `MissionPlanner.tsx` | 474 | `alert('Network error. Please try again.')` | `toast.error(...)` |
| `MissionPlanner.tsx` | 322 | `confirm('Are you sure you want to delete this mission?')` | `confirm({...})` dialog |

### UX-03: Confirmation Dialogs for Destructive Actions

**Actions needing confirmation:**
| Component | Action | Currently Has Confirm? |
|-----------|--------|----------------------|
| `MissionPlanner.tsx` | Delete mission | Yes (`confirm()`) -- replace with themed dialog |
| `MissionTemplateCreator.tsx` | Delete template | Yes (custom dialog) -- already done, extract to reusable |
| `EscortRequestDetail.tsx` | Delete escort request | Yes (custom dialog) -- already done, extract to reusable |
| `UserFleetBuilder.tsx` | Remove ship from fleet | **NO** -- add confirmation |
| `ResetProfileComponent.tsx` | Reset entire profile | **NO** -- add confirmation |
| `UserFleetBuilderWrapper.tsx` | Remove ship (same as above, different wrapper) | **NO** -- add confirmation |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `alert()` / `confirm()` | Custom toast + dialog components | Industry standard since ~2020 | Blocks UI thread, unstyled, bad UX |
| localStorage for profile | Server-side with localStorage cache | This migration | Data loss on browser clear |
| Inline notification per component | Centralized toast provider | React pattern maturity | Code duplication, inconsistent styling |

**Deprecated/outdated:**
- `useUserProfile` hook (localStorage-only): Will be rewritten to server-first
- `UserProfilePanel` component: May be redundant with `UserProfileContent` -- audit during implementation

## Open Questions

1. **Should `preferredGameplayLoops` be added to the server User schema?**
   - What we know: This field exists only in the localStorage `UserProfile` type. It is used in `UserProfilePanel` for UI display.
   - What's unclear: Is this field actively used and valued by users, or is it legacy UI?
   - Recommendation: Add to server schema since it's visible in the profile UI and will be lost on migration otherwise. Add as `preferredGameplayLoops: string[]` to the `User` type and profile API validation schema.

2. **Should `UserProfilePanel` be deprecated?**
   - What we know: `UserProfilePanel` uses the localStorage `useUserProfile` hook. `UserProfileContent` fetches directly from the API. Both exist but only `UserProfileContent` is used on the `/userprofile` page.
   - What's unclear: Whether `UserProfilePanel` is used anywhere else (search found no imports besides its own file and `debug-profile` page).
   - Recommendation: Check if `UserProfilePanel` is imported anywhere besides debug-profile. If not, deprecate it and unify on `UserProfileContent`. If it is used, update it to use the new server-first hook.

3. **Conflict resolution strategy for localStorage -> server migration**
   - What we know: Phase 8 risk note says "Profile localStorage migration needs conflict resolution strategy."
   - What's unclear: What happens when a user has localStorage profile data that differs from their server profile?
   - Recommendation: Server wins for fields already on server. For `preferredGameplayLoops` (only in localStorage), merge from localStorage on first load if server field is empty, then clear localStorage copy.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/hooks/useUserProfile.ts` -- current localStorage implementation
- Codebase analysis: `src/app/api/profile/route.ts` -- existing server profile API
- Codebase analysis: `src/components/dashboard/MissionTemplateCreator.tsx` -- existing notification + confirm dialog patterns
- Codebase analysis: `src/types/user.ts` and `src/types/UserProfile.ts` -- schema comparison
- Codebase analysis: `src/components/ui/mobiglas/` -- MobiGlas component library

### Secondary (MEDIUM confidence)
- Codebase analysis: `src/components/dashboard/MissionPlanner.tsx` -- alert/confirm inventory
- Codebase analysis: `src/components/UserFleetBuilderWrapper.tsx` -- dual localStorage+API storage pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all tools already in codebase
- Architecture: HIGH - Patterns already proven in MissionTemplateCreator; extracting to reusable components
- Pitfalls: HIGH - Schema mismatch and dual-component issue identified from direct code analysis
- Inventory: HIGH - Complete grep-based audit of all alert/confirm/localStorage calls

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable -- internal codebase patterns, no external API changes)
