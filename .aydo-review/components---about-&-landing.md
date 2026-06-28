# Components - About & Landing Review

Scope: about page sections (history, directives, subsidiaries, operations) and landing page sections (hero, services, join).

Reviewed files:
- `src/components/about/AboutHero.tsx`
- `src/components/about/AboutTabs.tsx`
- `src/components/about/DataFeedSection.tsx`
- `src/components/about/DirectiveCard.tsx`
- `src/components/about/DirectivesSection.tsx`
- `src/components/about/HistorySection.tsx`
- `src/components/about/JoinCTASection.tsx`
- `src/components/about/OperationsTab.tsx`
- `src/components/about/SubsidiariesTab.tsx`
- `src/components/about/TimelineNode.tsx`
- `src/components/landing/AboutSection.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/JoinUsSection.tsx`
- `src/components/landing/ServicesSection.tsx`

## Summary

Findings count: 13

Severity breakdown:
- Critical: 0
- High: 0
- Medium: 8
- Low: 5

Verification notes:
- Read all 14 assigned component files in full.
- Checked related `cdn()` helper, Next image configuration, `MobiGlasButton`, and the about page parent wiring for context.
- `npm run type-check -- --pretty false` is currently blocked by repository-level TypeScript configuration deprecation errors.
- Retried with `--ignoreDeprecations 6.0`; type-check still fails globally because dependencies/types such as `react`, `next`, `zod`, `mongodb`, `vitest`, and Node globals are not resolvable in this workspace. The output is repository-wide and not specific enough to validate these components.
- ESLint could not be run: `npx eslint` resolved ESLint 10 without a flat config, and no local `./node_modules/.bin/eslint` binary exists.

## Findings

### 1. `src/components/about/AboutHero.tsx`

- Line(s): 77-94
- Category: bug
- Severity: medium
- Description: The particle positions, durations, and delays are generated with `Math.random()` directly during render. In a Next.js client component that is server-rendered for initial HTML, those random values can differ between the server render and client hydration, producing hydration mismatches and visible particle jumps.
- Suggested fix direction: Generate particle metadata once after mount or memoize it from a deterministic seed. Alternatively render the decorative particle layer only after client mount.

### 2. `src/components/about/AboutHero.tsx`

- Line(s): 15, 55
- Category: failure-point
- Severity: low
- Description: The displayed clock is initialized from `new Date()` during render and formatted with `toLocaleTimeString()`. If the server-rendered minute/timezone differs from the client at hydration time, the status bar can hydrate with a text mismatch.
- Suggested fix direction: Initialize the clock only after mount, render a stable placeholder until mounted, or suppress hydration only for the time text if a live clock is required.

### 3. `src/components/about/AboutHero.tsx`

- Line(s): 16-31, 164-172
- Category: failure-point
- Severity: low
- Description: The scroll listener updates component state on every scroll, but the only consumer is an empty decorative `motion.div` whose content was removed. This causes continuous re-renders on scroll with no visible output.
- Suggested fix direction: Remove the scroll state/listener and empty parallax element, or restore a visible parallax effect that uses throttled/requestAnimationFrame-based updates.

### 4. `src/components/about/AboutTabs.tsx`

- Line(s): 21-41
- Category: failure-point
- Severity: low
- Description: The tab controls are visually implemented as tabs, but they do not expose tab semantics (`role="tablist"`, `role="tab"`, `aria-selected`, controlled panels) or keyboard tab behavior. Assistive technologies will treat them as unrelated buttons and users will not get standard tab navigation behavior.
- Suggested fix direction: Add accessible tablist/tab/panel semantics and keyboard handling, or use a tested tab component that provides ARIA behavior.

### 5. `src/components/about/DataFeedSection.tsx`

- Line(s): 69, 159-199
- Category: bug
- Severity: medium
- Description: The completion animation is unreachable. The component returns `null` whenever `connectionComplete` is true at line 69, so the later `{connectionComplete && (...)}` overlay can never render.
- Suggested fix direction: Do not return `null` solely because `connectionComplete` is true if the completion overlay should show. Track a separate transient `showCompletionAnimation` state or move the overlay before the early return.

### 6. `src/components/about/DataFeedSection.tsx`

- Line(s): 47-62
- Category: bug
- Severity: low
- Description: The interval increments progress with `connectionProgress + 1` and checks completion against the stale pre-increment value. When the displayed progress reaches 100, the next tick still calls `onProgressUpdate(101)` before completing.
- Suggested fix direction: Compute `nextProgress = Math.min(connectionProgress + 1, 100)`, update with the clamped value, and complete when `nextProgress >= 100`.

### 7. `src/components/about/DirectivesSection.tsx`

- Line(s): 24-45
- Category: bug
- Severity: medium
- Description: Floating particle `left`, `top`, `duration`, and `delay` values are generated with `Math.random()` directly during render. This is non-deterministic across server render and client hydration and can cause hydration warnings or visual jumps.
- Suggested fix direction: Precompute particle data in stable state after mount or use deterministic seeded values that are identical on server and client.

### 8. `src/components/about/HistorySection.tsx`

- Line(s): 64-142
- Category: bug
- Severity: medium
- Description: The timeline contains conflicting duplicate corporate history events. It shows founding in both 2911 and 2940, merger/first expansion in both 2938 and 2943, and corporate formation/incorporation in both 2945 and 2948 with overlapping descriptions. This produces an internally inconsistent timeline for the page.
- Suggested fix direction: Reconcile the source chronology and remove or merge duplicate timeline nodes so each event appears once with the correct year and title.

### 9. `src/components/about/HistorySection.tsx`

- Line(s): 116
- Category: bug
- Severity: medium
- Description: The `content` prop is a JavaScript string containing `&quot;AydoCorp&quot;`. React escapes string props as text; it will render the literal text `&quot;AydoCorp&quot;` instead of quotation marks. The same string also includes leading indentation that will be preserved in the rendered text node.
- Suggested fix direction: Use normal quotes inside the string (escaped as needed for JavaScript) and trim the leading whitespace.

### 10. `src/components/about/SubsidiariesTab.tsx`

- Line(s): 70, 133
- Category: failure-point
- Severity: low
- Description: Two images are hard-coded to `https://images.aydocorp.space/...` instead of using the shared `cdn()` helper used by the rest of the component. If `NEXT_PUBLIC_IMAGE_BASE_URL`, `CLOUDFLARE_R2_BUCKET_URL`, or `NEXT_PUBLIC_IMAGE_PATH_PREFIX` is changed, these images will not follow the configured asset source.
- Suggested fix direction: Route these image paths through `cdn()` or centralize all external image URLs behind the same image-base configuration.

### 11. `src/components/landing/HeroSection.tsx`

- Line(s): 11, 114
- Category: failure-point
- Severity: low
- Description: The date is initialized with `new Date()` during render and formatted with `toLocaleDateString()`. Around midnight, timezone differences, or delayed hydration, the server-rendered date can differ from the client-rendered date and trigger a hydration text mismatch.
- Suggested fix direction: Render a stable date placeholder until the component mounts, then set the date in `useEffect`, or explicitly suppress hydration for the live date text.

### 12. `src/components/landing/JoinUsSection.tsx`

- Line(s): 212-221, 234-240
- Category: stub
- Severity: medium
- Description: The visible application calls to action (`Apply for this position` and `Submit your general application`) are buttons without `onClick`, `type`, link wrapping, form submission, or navigation. They appear actionable but cannot start an application flow.
- Suggested fix direction: Wire these buttons to the intended application route/form/modal, or replace them with disabled/non-action copy until the application flow exists.

### 13. `src/components/landing/ServicesSection.tsx`

- Line(s): 190-197
- Category: stub
- Severity: medium
- Description: The `CONTACT OUR SPECIALISTS` call-to-action renders a `MobiGlasButton` with no `onClick`, surrounding `Link`, form behavior, or navigation target. Users cannot contact specialists from this CTA despite it being presented as an action.
- Suggested fix direction: Wrap the button in a `Link` to the existing contact route or attach the intended contact modal/form handler.

## Files with no findings identified

- `src/components/about/DirectiveCard.tsx`
- `src/components/about/JoinCTASection.tsx`
- `src/components/about/OperationsTab.tsx`
- `src/components/about/TimelineNode.tsx`
- `src/components/landing/AboutSection.tsx`
