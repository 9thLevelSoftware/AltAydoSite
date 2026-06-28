# MobiGlas UI System Review

Scope: container, panel, button, input, pagination, dialog, toast, scanline, data stream, holographic border, status indicator, corner accents, icons, and barrel exports.

Reviewed files: 16
Findings: 13
Severity breakdown: critical 0, high 0, medium 9, low 4

Verification notes:
- Read all 16 assigned files in full.
- Searched assigned MobiGlas files for TODO/FIXME/HACK/unimplemented placeholders; no stub comments were found in the reviewed files.
- Confirmed MobiGlas theme variables exist in `src/app/globals.css`.
- Attempted targeted `npm run lint -- --file ...`; blocked because `next` is not installed/found in this checkout (`sh: next: command not found`).
- Attempted `npm run type-check -- --pretty false`; blocked by deprecated tsconfig options. Retried with `npx tsc --noEmit --pretty false --ignoreDeprecations 6.0`; output was dominated by missing project dependencies/types such as next, react, zod, mongodb, vitest, and @types/node.
- No source code was modified; only this review report was written.

Files reviewed with no specific findings: src/components/ui/mobiglas/HolographicBorder.tsx, src/components/ui/mobiglas/MobiGlasContainer.tsx, src/components/ui/mobiglas/MobiGlasFormError.tsx, src/components/ui/mobiglas/ScanlineEffect.tsx, src/components/ui/mobiglas/StatusIndicator.tsx.

## Findings

### 1. src/components/ui/icons/index.tsx:7-78
Category: failure-point
Severity: low
Description: The exported SVG icon components do not set `aria-hidden`, `focusable="false"`, or expose a `<title>`/`aria-label` option. When these icons are used decoratively beside text, assistive technologies may announce unlabeled graphics or include extra focus/semantics noise.
Suggested fix direction: Add an accessibility prop pattern, default decorative icons to `aria-hidden="true" focusable="false"`, and allow callers to pass a title/label when an icon conveys meaning by itself.

### 2. src/components/ui/mobiglas/CornerAccents.tsx:31-46,76,106
Category: bug
Severity: medium
Description: Color classes are assembled at runtime with string replacement and template interpolation, for example replacing `var(--opacity)` in `border-[rgba(var(--mg-primary),var(--opacity))]` and building `bg-[rgba(var(--mg-${color}),...)]`. Tailwind JIT only emits classes it can see statically; the runtime-produced arbitrary-value classes such as `border-[rgba(var(--mg-primary),0.6)]` and `bg-[rgba(var(--mg-primary),0.6)]` are not guaranteed to exist in the generated CSS, so corner borders/dots can silently lose their color styling.
Suggested fix direction: Use inline styles for dynamic CSS variable colors/opacities, CSS custom properties with a stable static class, or enumerate every full Tailwind class string in a static map without runtime mutation.

### 3. src/components/ui/mobiglas/DataStreamBackground.tsx:49-57
Category: bug
Severity: medium
Description: The stream dot animates `y: ['-10%', '110%']`. In Motion, percentage `y` values are transform percentages relative to the animated dot's own height, not the parent stream height. The dot therefore moves only a few pixels around the top of the stream instead of travelling vertically through the whole container.
Suggested fix direction: Animate positional properties such as `top: ['-10%', '110%']`, or animate `translateY` with pixel/container-derived values via CSS keyframes on an element whose movement is relative to the container.

### 4. src/components/ui/mobiglas/MobiGlasButton.tsx:88,92-93
Category: bug
Severity: low
Description: The rendered button is disabled when `disabled || isLoading`, but the hover/tap animation guards check only `disabled`. A loading button with `isLoading={true}` can still use the active hover/tap scale values even though it is disabled and should appear inert.
Suggested fix direction: Derive a single `isDisabled = disabled || isLoading` value and use it consistently for the `disabled` attribute, scanline gating, and `whileHover`/`whileTap` animation guards.

### 5. src/components/ui/mobiglas/MobiGlasConfirmDialog.tsx:50-52,72-85
Category: failure-point
Severity: medium
Description: The dialog sets `role="dialog"` and `aria-modal="true"`, but it does not connect the visible title and message to the dialog with `aria-labelledby` and `aria-describedby`. Screen reader users may hear a generic dialog without the confirmation title/message context.
Suggested fix direction: Generate stable ids with `useId`, assign them to the heading and message, and set `aria-labelledby`/`aria-describedby` on the dialog container. Consider putting the dialog role on the panel element rather than the full-screen backdrop.

### 6. src/components/ui/mobiglas/MobiGlasInput.tsx:23-25,98-99
Category: bug
Severity: medium
Description: When callers omit `id`, input and textarea ids are generated with `Math.random()` during render. In a Next client component this can cause server/client hydration id mismatches, and every re-render can change `id`, `htmlFor`, and error ids, weakening label/error associations while the user interacts with controlled fields.
Suggested fix direction: Use React `useId()` once per component instance, or store the generated id in `useRef`, so fallback ids are stable across server render, hydration, and subsequent re-renders.

### 7. src/components/ui/mobiglas/MobiGlasPagination.tsx:29-31,97-101,123-160
Category: failure-point
Severity: medium
Description: Pagination assumes valid positive `totalPages`, `currentPage`, and `pageSize` values. Invalid or stale inputs can produce broken ranges such as `Showing 1-0 of N items`, allow navigation to page `0`/negative pages, or throw for negative `totalPages` via `Array.from({ length: total })`.
Suggested fix direction: Clamp `currentPage` into `[1, totalPages]`, guard `totalPages <= 0` and `pageSize <= 0`, and disable/hide navigation controls when normalized pagination state is invalid or empty.

### 8. src/components/ui/mobiglas/MobiGlasPanel.tsx:68-74
Category: bug
Severity: low
Description: `mergedMotionProps.transition` always writes `delay: animationDelay`. Because `animationDelay` defaults to `0`, any caller-provided `transition.delay` is overwritten unless the caller also passes `animationDelay`. This contradicts the "merge" behavior and can break staggered/custom animations.
Suggested fix direction: Only override `transition.delay` when `animationDelay` is explicitly provided, or default `animationDelay` to `undefined` and preserve an existing `motionProps.transition.delay` when present.

### 9. src/components/ui/mobiglas/MobiGlasPanel.tsx:101-117
Category: bug
Severity: medium
Description: The panel scanline animates `y: ['0%', '100%', '0%']` on a `h-1` absolute element. Like the data stream issue, percentage transforms are relative to the scanline element's own height, so the line moves roughly one line-height instead of scanning across the full panel.
Suggested fix direction: Animate `top` from `0%` to `100%`, use CSS keyframes that position relative to the panel, or make the animated element span the panel height and animate an internal gradient.

### 10. src/components/ui/mobiglas/MobiGlasPanel.tsx:124-143
Category: bug
Severity: medium
Description: Corner and title accent classes interpolate `accentColor` into Tailwind arbitrary classes such as `border-[rgba(var(--mg-${accentColor}),0.6)]` and `text-[rgba(var(--mg-${accentColor}),0.9)]`. Tailwind cannot statically discover these runtime class names, so default and custom accent colors may not be emitted in production CSS.
Suggested fix direction: Replace dynamic arbitrary class names with inline styles/CSS variables, or constrain `accentColor` to a typed union and map each value to complete static class strings.

### 11. src/components/ui/mobiglas/MobiGlasToast.tsx:56-92 and src/components/ui/mobiglas/MobiGlasToastProvider.tsx:79-90
Category: failure-point
Severity: medium
Description: Toasts are visually displayed but are not exposed as a live region (`role="status"`/`role="alert"`, `aria-live`, `aria-atomic`). Screen reader users may never be notified about success/error/warning messages.
Suggested fix direction: Add an appropriate live region to the toast container or individual toast based on severity, for example `role="status"` for info/success and `role="alert"` for errors, with `aria-live` and `aria-atomic` semantics.

### 12. src/components/ui/mobiglas/MobiGlasToastProvider.tsx:39-41
Category: failure-point
Severity: low
Description: Toast ids rely directly on `crypto.randomUUID()`. If the provider is ever used in an older browser/webview or non-standard test environment where `crypto.randomUUID` is unavailable, adding a toast throws before any notification is shown.
Suggested fix direction: Use a small id helper that checks `globalThis.crypto?.randomUUID` and falls back to a monotonic counter or timestamp/random combination for unsupported environments.

### 13. src/components/ui/mobiglas/index.ts:12-19
Category: error
Severity: medium
Description: Several barrel `Props` exports re-export the default component type under a `*Props` name, e.g. `export type { default as MobiGlasButtonProps } from './MobiGlasButton';`, instead of exporting the named props interfaces declared in the component files. Type consumers importing `MobiGlasButtonProps`, `MobiGlasPanelProps`, etc. from the barrel will receive the component type or an invalid/misleading type rather than the props shape they expect.
Suggested fix direction: Export the actual named interfaces from each module, for example `export type { MobiGlasButtonProps } from './MobiGlasButton';`, and add missing named prop exports for textarea, toast, dialog, data stream, holographic border, and other public components as needed.
