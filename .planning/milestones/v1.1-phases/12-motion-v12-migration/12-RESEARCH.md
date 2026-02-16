# Phase 12: Motion v12 Migration - Research

**Researched:** 2026-02-15
**Domain:** Animation library migration (framer-motion 10.x -> motion 12.x)
**Confidence:** HIGH

## Summary

This phase migrates from `framer-motion@10.18.0` to `motion@12.x` (latest 12.34.0) across 112 files, and introduces `LazyMotion` with `domMax` features for bundle size reduction. The migration is straightforward because **there are no breaking changes in Motion for React in version 12** -- the primary work is a mechanical import path change from `"framer-motion"` to `"motion/react"` plus a package swap in package.json.

The codebase uses a limited set of imports (8 unique patterns), with no usage of any APIs removed in v11 (`AnimateSharedLayout`, `exitBeforeEnter`, `useInvertedScale`, `value.onChange`). Five files use `staggerChildren` in variant transitions, which still works but was deprecated in 12.22.0 -- these should be migrated to the new `stagger()` function for future-proofing.

**Primary recommendation:** Do a single atomic package swap (`npm uninstall framer-motion && npm install motion`), then bulk find-and-replace all imports from `"framer-motion"` to `"motion/react"`, add a `LazyMotion` provider with `domMax` to the existing Providers component, and validate with a full build.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `motion` | ^12.34.0 | React animation library | Official successor to framer-motion; same author, same API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `motion/react` | (entry point) | React-specific exports | All component imports |
| `motion/react-m` | (entry point) | Slim `m` component for LazyMotion | When using LazyMotion with strict mode |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Full `m` component migration | Keep `motion` component with `LazyMotion` (no strict) | Using `motion` inside LazyMotion negates bundle savings; but migrating 112 files from `motion.div` to `m.div` is massive scope. Recommendation: use `LazyMotion` WITHOUT strict mode initially, keeping `motion` components. Bundle savings still apply for the LazyMotion wrapper itself. Strict + `m` component is a future optimization. |
| `domMax` features | `domAnimation` features | `domAnimation` is ~15kb smaller but lacks layout animations and drag. This codebase uses `layoutId` (2 files) so `domMax` is required. |

**Installation:**
```bash
npm uninstall framer-motion && npm install motion
```

## Architecture Patterns

### LazyMotion Provider Placement

The `LazyMotion` provider should be added to the existing `Providers` component at `src/components/providers/index.tsx`. This is already a `'use client'` component that wraps the entire app.

```typescript
// src/components/providers/index.tsx
'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { LazyMotion, domMax } from 'motion/react';
import { MobiGlasToastProvider } from '@/components/ui/mobiglas/MobiGlasToastProvider';
import { ConfirmDialogProvider } from '@/hooks/useConfirmDialog';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <LazyMotion features={domMax}>
        <MobiGlasToastProvider>
          <ConfirmDialogProvider>
            {children}
          </ConfirmDialogProvider>
        </MobiGlasToastProvider>
      </LazyMotion>
    </SessionProvider>
  );
}
```

### Import Migration Pattern

All 112 files follow the same mechanical transformation:

**Before:**
```typescript
import { motion, AnimatePresence } from 'framer-motion';
```

**After:**
```typescript
import { motion, AnimatePresence } from 'motion/react';
```

All named exports (`motion`, `AnimatePresence`, `Variants`, `MotionProps`, `useAnimation`, `useReducedMotion`) are available from `"motion/react"` with identical APIs.

### Anti-Patterns to Avoid
- **Mixing `motion` and `m` components:** If you use `LazyMotion` with `strict={true}`, any `motion` component inside will throw. Since migrating 112 files to use `m` instead of `motion` is out of scope, do NOT set `strict={true}`.
- **Importing from `"motion"` instead of `"motion/react"`:** The `"motion"` entry point is for vanilla JS. React components must come from `"motion/react"`.
- **Keeping both packages:** Do not have both `framer-motion` and `motion` in package.json. This causes dual-package bundle bloat.
- **Async LazyMotion features loading:** For this app, use synchronous `domMax` import. Async loading adds complexity for minimal benefit since animations are needed on first render.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Import migration | Manual file-by-file editing | Bulk find-and-replace (`"framer-motion"` -> `"motion/react"`) | 112 files, identical transform, zero decision-making needed |
| Bundle optimization | Custom code splitting | `LazyMotion` + `domMax` | Built-in feature of motion package |
| stagger migration | Custom delay logic | `stagger()` function from motion/react | Drop-in replacement for deprecated `staggerChildren` |

**Key insight:** This migration is 95% mechanical find-and-replace. The complexity is in volume, not in decision-making.

## Common Pitfalls

### Pitfall 1: Dual Package Installation
**What goes wrong:** Both `framer-motion` and `motion` end up in node_modules, doubling the animation bundle.
**Why it happens:** Installing `motion` without uninstalling `framer-motion` first, or a transitive dependency pulling it in.
**How to avoid:** Uninstall framer-motion FIRST, then install motion. Verify with `npm ls framer-motion` after -- should show "empty".
**Warning signs:** Bundle analyzer shows both packages; `npm ls framer-motion` returns results.

### Pitfall 2: Missing File in Import Migration
**What goes wrong:** One file still imports from `"framer-motion"`, causing build failure after package removal.
**Why it happens:** 112 files is a lot; easy to miss one.
**How to avoid:** After find-and-replace, run `grep -r "framer-motion" src/` to verify zero remaining references. Also check for any imports in non-src directories.
**Warning signs:** TypeScript errors about missing module `"framer-motion"`.

### Pitfall 3: MotionProps Type Change in v11
**What goes wrong:** `MotionProps` was refactored in v11 into a different type structure.
**Why it happens:** The codebase uses `MotionProps` in 3 MobiGlas components (`MobiGlasPanel`, `MobiGlasContainer`, `MobiGlasButton`).
**How to avoid:** Verify that `import { MotionProps } from 'motion/react'` compiles correctly. If not, switch to `HTMLMotionProps<'div'>` (generic version specifying element type). Run `npm run type-check` to verify.
**Warning signs:** TypeScript errors on `MotionProps` after migration.

### Pitfall 4: staggerChildren Deprecation Warning
**What goes wrong:** Console warnings about deprecated `staggerChildren` in 5 files.
**Why it happens:** `staggerChildren` and `staggerDirection` were deprecated in motion 12.22.0.
**How to avoid:** Migrate to the new `stagger()` function syntax during this phase.
**Warning signs:** Console deprecation warnings during development.

### Pitfall 5: LazyMotion Without Effect
**What goes wrong:** Adding LazyMotion but still using `motion` components means no bundle size reduction.
**Why it happens:** The `motion` component is pre-bundled with all features (~34kb). LazyMotion only benefits the `m` component.
**How to avoid:** Understand that LazyMotion + `motion` components still provides the provider infrastructure for future `m` migration. The immediate benefit is establishing the pattern; full savings come when migrating to `m` in the future. The package swap itself (framer-motion -> motion) may already yield some size improvement due to tree-shaking improvements in motion v12.
**Warning signs:** Bundle size doesn't decrease as expected.

## Code Examples

### Example 1: Standard Import Migration
```typescript
// Before (framer-motion 10.x)
import { motion, AnimatePresence } from 'framer-motion';

// After (motion 12.x)
import { motion, AnimatePresence } from 'motion/react';
```

### Example 2: Type Import Migration
```typescript
// Before
import { motion, MotionProps } from 'framer-motion';
export interface MyProps extends Omit<MotionProps, 'children'> { ... }

// After
import { motion, MotionProps } from 'motion/react';
export interface MyProps extends Omit<MotionProps, 'children'> { ... }
// If MotionProps doesn't compile, use:
import { motion, type HTMLMotionProps } from 'motion/react';
export interface MyProps extends Omit<HTMLMotionProps<'div'>, 'children'> { ... }
```

### Example 3: useAnimation Import
```typescript
// Before
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// After
import { motion, AnimatePresence, useAnimation } from 'motion/react';
```

### Example 4: staggerChildren Migration (deprecated -> modern)
```typescript
// Before (deprecated in 12.22.0)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// After (modern stagger() function)
import { stagger } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: stagger(0.1)
    }
  }
};
```

### Example 5: LazyMotion Provider Setup (synchronous)
```typescript
// Source: motion.dev/docs/react-lazy-motion
'use client';

import { LazyMotion, domMax } from 'motion/react';

export default function Providers({ children }) {
  return (
    <LazyMotion features={domMax}>
      {children}
    </LazyMotion>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `import from "framer-motion"` | `import from "motion/react"` | motion 11.11.12 (2024) | Package rename; API identical for React |
| `motion()` factory function | `motion.create()` | motion 11.4.0 (2024-09) | Deprecated old syntax (NOT used in this codebase) |
| `staggerChildren` transition option | `delayChildren: stagger(0.1)` | motion 12.22.0 (2025-07) | Deprecated; still works but emits warnings |
| `exitBeforeEnter` on AnimatePresence | `mode="wait"` | framer-motion 7.x | Removed in 11.0; throws error (NOT used in this codebase) |
| `AnimateSharedLayout` | `LayoutGroup` | framer-motion 6.x | Removed in 11.0 (NOT used in this codebase) |
| `value.onChange()` | `value.on("change", cb)` | framer-motion 11.0 | Removed (NOT used in this codebase) |

**Deprecated/outdated:**
- `framer-motion` package: Deprecated in favor of `motion`. The npm page for framer-motion directs users to install `motion` instead.
- `staggerChildren` / `staggerDirection`: Deprecated in 12.22.0, replaced by `stagger()` function.

## Codebase-Specific Findings

### Import Pattern Census (112 files)
| Import Pattern | File Count | Notes |
|----------------|------------|-------|
| `import { motion } from 'framer-motion'` | ~75 | Most common; simple motion components |
| `import { motion, AnimatePresence } from 'framer-motion'` | ~25 | Exit animations |
| `import { AnimatePresence, motion } from 'framer-motion'` | ~5 | Same as above, different order |
| `import { AnimatePresence } from 'framer-motion'` | 1 | MobiGlasToastProvider |
| `import { motion, MotionProps } from 'framer-motion'` | 3 | MobiGlasPanel, MobiGlasContainer, MobiGlasButton |
| `import { motion, Variants } from 'framer-motion'` | 1 | Dashboard page |
| `import { motion, AnimatePresence, useAnimation } from 'framer-motion'` | 1 | EventCarousel |
| `import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'` | 1 | MissionCard |

### Files Using staggerChildren (need stagger() migration)
1. `src/components/fleet-ops/mission-planner/MissionList.tsx`
2. `src/components/fleet-ops/mission-planner/MissionFilters.tsx`
3. `src/components/fleet-ops/mission-planner/MissionDetail.tsx`
4. `src/components/fleet-ops/mission-planner/MissionDashboard.tsx`
5. `src/components/dashboard/DashboardPanelLayout.tsx`

### Files Using layoutId (require domMax, not domAnimation)
1. `src/components/fleet-composition/FleetCompositionTabs.tsx` (`layoutId="fleet-tab-indicator"`)
2. `src/components/landing/AboutSection.tsx` (`layoutId="activeTabLine"`)

### Files Using MotionProps Type (verify type compatibility)
1. `src/components/ui/mobiglas/MobiGlasPanel.tsx`
2. `src/components/ui/mobiglas/MobiGlasContainer.tsx`
3. `src/components/ui/mobiglas/MobiGlasButton.tsx`

### Provider Integration Point
- File: `src/components/providers/index.tsx`
- Already a `'use client'` component
- Currently wraps: SessionProvider > MobiGlasToastProvider > ConfirmDialogProvider
- LazyMotion should be added as the outermost wrapper (or just inside SessionProvider)

## Open Questions

1. **Bundle size improvement magnitude**
   - What we know: Full `motion` component is ~34kb; `LazyMotion` + `m` component is ~4.6kb. But we are NOT migrating to `m` -- just adding the LazyMotion wrapper.
   - What's unclear: The exact bundle size delta from switching packages (framer-motion 10 -> motion 12) without the `m` component migration.
   - Recommendation: Run `npm run analyze` before and after to measure actual impact. The package swap may yield tree-shaking improvements even without `m` migration. The "~30kb reduction" success criterion may only be fully achievable with a future `m` component migration.

2. **MotionProps type compatibility**
   - What we know: `MotionProps` is documented as available from `motion/react`. The codebase uses `Omit<MotionProps, 'children'>`.
   - What's unclear: Whether the type shape is identical between framer-motion 10 and motion 12 (LOW confidence on exact compatibility).
   - Recommendation: `npm run type-check` after migration will immediately surface any issues. Fallback is `HTMLMotionProps<'div'>`.

3. **staggerChildren deprecation timeline**
   - What we know: Deprecated in 12.22.0 (July 2025) with console warnings. Still functional.
   - What's unclear: When it will be fully removed.
   - Recommendation: Migrate to `stagger()` in this phase to avoid future breakage. Only 5 files affected.

## Sources

### Primary (HIGH confidence)
- [motion.dev/docs/react-upgrade-guide](https://motion.dev/docs/react-upgrade-guide) - Official migration guide from framer-motion to motion
- [motion.dev/docs/upgrade-guide](https://motion.dev/docs/upgrade-guide) - Version-by-version breaking changes
- [motion.dev/docs/react-lazy-motion](https://motion.dev/docs/react-lazy-motion) - LazyMotion documentation
- [motion.dev/docs/react-reduce-bundle-size](https://motion.dev/docs/react-reduce-bundle-size) - Bundle size reduction strategies
- [GitHub motiondivision/motion CHANGELOG.md](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md) - Detailed changelog with all breaking changes

### Secondary (MEDIUM confidence)
- [npmjs.com/package/motion](https://www.npmjs.com/package/motion) - Latest version 12.34.0 confirmed
- [npmjs.com/package/framer-motion](https://www.npmjs.com/package/framer-motion) - Deprecated package, directs to motion
- [motion.dev/changelog](https://motion.dev/changelog) - High-level changelog

### Tertiary (LOW confidence)
- staggerChildren deprecation details extracted from WebFetch of CHANGELOG.md -- version 12.22.0 deprecation is from a WebFetch summary, not directly verified in source text. Validate by checking console warnings after install.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official package rename with clear migration path; verified through multiple sources
- Architecture: HIGH - LazyMotion pattern well-documented; Providers component clearly identified as integration point
- Pitfalls: HIGH - Codebase fully audited for removed APIs (none found); all import patterns catalogued
- stagger() migration: MEDIUM - Deprecation confirmed but exact API shape of stagger() in variant context needs validation during implementation

**Research date:** 2026-02-15
**Valid until:** 2026-04-15 (stable library, slow-moving changes)
