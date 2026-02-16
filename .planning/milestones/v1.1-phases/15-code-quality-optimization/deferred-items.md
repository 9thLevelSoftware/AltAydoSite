# Deferred Items - Phase 15

## Pre-existing Issues Found During Execution

### 1. About page TypeScript errors (discovered in 15-04)
**Location:** `src/app/about/page.tsx` lines 56-57
**Error:** `Cannot find name 'time'` and `Cannot find name 'scrollPosition'`
**Root cause:** The `time` and `scrollPosition` state variables were removed from the About component but are still passed to `AboutHero`.
**Impact:** TypeScript type-check fails
**Suggested fix:** Either restore the removed state hooks or update AboutHero to not require these props

---

*Last updated: 2026-02-16*
