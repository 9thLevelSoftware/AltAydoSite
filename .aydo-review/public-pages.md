# Public Pages Review

Task: review public-facing app pages
Scope: 33 files under `src/app`
Date: 2026-06-27

## Summary

Findings count: 12

Severity breakdown:
- critical: 0
- high: 3
- medium: 4
- low: 5

Category breakdown:
- bug: 3
- stub: 2
- error: 2
- failure-point: 5

Verification notes:
- Reviewed all 33 assigned files manually with line-numbered reads.
- Ran `npm run type-check -- --pretty false`; it failed before file-level checking because `tsconfig.json` uses deprecated `moduleResolution=node10` and `baseUrl` without `ignoreDeprecations`. No code fixes were attempted.

## Findings

### F-001: Admin authorization is a hard-coded placeholder

- File path: `src/app/admin/page.tsx`
- Line number(s): 16-18
- Category: stub
- Severity: high
- Description: The admin gate is explicitly marked TODO/placeholder and grants admin access by comparing the session email to a single hard-coded address. This is brittle, bypasses the application's role/clearance model, and requires a source deploy to add or remove admins.
- Suggested fix direction: Move admin authorization into the authenticated user/session model or server-side database role lookup, and fail closed when the role claim is absent or stale. Keep the check server-side before rendering `AdminDashboardContent`.

### F-002: Debug profile route is protected only by a client-side environment check and no auth gate

- File path: `src/app/debug-profile/page.tsx`
- Line number(s): 27-30, 32-80, 82-153
- Category: failure-point
- Severity: high
- Description: The page blocks only when `process.env.NODE_ENV === 'production'`, and the check lives in a client component. In any non-production deployment, preview deployment, or misconfigured production build, the route is publicly reachable without an explicit authenticated/admin check. Once loaded, it fetches `/api/profile` for authenticated visitors and renders debug tooling.
- Suggested fix direction: Enforce route access in server-side middleware/layout/page code and require an authorized debug/admin role. Prefer removing this route from deployed builds entirely or gating it with a dedicated feature flag that defaults off.

### F-003: Debug profile page renders sensitive profile and browser-storage contents

- File path: `src/app/debug-profile/page.tsx`
- Line number(s): 39-50, 120-128, 134-148
- Category: failure-point
- Severity: medium
- Description: The page enumerates every `localStorage` key/value and dumps the full server profile JSON into the DOM. Browser storage can contain session-adjacent state, cached profile data, feature flags, or other sensitive values, and the server profile includes email and personal/profile fields.
- Suggested fix direction: Avoid dumping arbitrary storage. If debug output is still needed, redact sensitive keys/fields, whitelist only expected non-sensitive values, and require privileged access before rendering.

### F-004: Reset profile route exposes a destructive debug action without server-side authorization

- File path: `src/app/reset-profile/page.tsx`
- Line number(s): 3-12
- Category: failure-point
- Severity: high
- Description: Like the debug page, this route only checks `NODE_ENV` in a client component and then renders `ResetProfileComponent`. The imported component clears profile-related local storage/session storage and attempts to reset server-side profile fields. A non-production or misconfigured deployment would expose a destructive profile reset path without route-level auth/role enforcement.
- Suggested fix direction: Move the access check to server-side route protection and require an authenticated owner/admin before rendering or invoking reset behavior. Consider removing this page from deployed builds and exposing reset only inside an authenticated settings/debug panel.

### F-005: Reset-password submit handler does not validate token before posting

- File path: `src/app/reset-password/page.tsx`
- Line number(s): 21-29, 31-66, 173-178
- Category: failure-point
- Severity: medium
- Description: The UI disables fields/buttons when `token` is absent, but `handleSubmit` itself validates only password fields before posting `{ token, password, confirmPassword }` to `/api/auth/reset-password`. A race, scripted submit, or future UI change can submit an empty token value.
- Suggested fix direction: Add an explicit `if (!token)` guard inside `handleSubmit` before setting loading/submitting. Keep server-side token validation as the authoritative check.

### F-006: Reset-password assumes every response body is JSON

- File path: `src/app/reset-password/page.tsx`
- Line number(s): 55-72, 80-83
- Category: error
- Severity: low
- Description: The code calls `await response.json()` before checking `response.ok` or the response content type. If the API returns an empty body, HTML error page, proxy error, or non-JSON response, parsing throws and the specific server status/message is lost behind a generic unexpected-error message.
- Suggested fix direction: Check `response.headers.get('content-type')` before parsing JSON, gracefully handle empty/non-JSON bodies, and fall back to status-aware messages.

### F-007: Forgot-password assumes every response body is JSON

- File path: `src/app/forgot-password/page.tsx`
- Line number(s): 30-43, 50-53
- Category: error
- Severity: low
- Description: The code calls `await response.json()` before checking status or content type. Non-JSON error responses will throw into the catch block, hiding the actual HTTP status and any useful server-side error information.
- Suggested fix direction: Parse JSON only when the content type is JSON, handle empty/non-JSON bodies, and preserve a status-aware fallback message.

### F-008: Services page renders the current time during initial render

- File path: `src/app/services/page.tsx`
- Line number(s): 224
- Category: bug
- Severity: medium
- Description: `new Date().toLocaleTimeString()` is called directly in JSX for a client component. Client components can be prerendered to HTML and then hydrated; a time value generated during server prerender can differ from the client's first render, causing hydration mismatch warnings or text replacement.
- Suggested fix direction: Initialize time after mount with `useEffect`, render a stable placeholder until mounted, or add `suppressHydrationWarning` only if the mismatch is intentional and harmless.

### F-009: Services scan interval is recreated on every progress tick

- File path: `src/app/services/page.tsx`
- Line number(s): 112-162
- Category: bug
- Severity: low
- Description: The scan effect depends on `scanProgress`, and the interval callback also updates `scanProgress`. This tears down and recreates the interval every tick. It also reads the stale closed-over `scanProgress` value when setting `highlightedService`, making the highlight lag the actual progress and making the timing harder to reason about.
- Suggested fix direction: Start one interval when `isScanning` changes, derive both progress and highlighted service from the functional `prev` value, and stop scanning by setting `isScanning` false when completion is reached.

### F-010: Services page updates React state on every global mousemove

- File path: `src/app/services/page.tsx`
- Line number(s): 81-96, 98-110, 257-260
- Category: failure-point
- Severity: low
- Description: A window-level `mousemove` listener calls `setMousePosition` for every mouse event, and each update re-renders the whole services page so the hero parallax can move. On pointer-heavy desktop usage this can produce unnecessary render pressure and jank, especially with many motion components and images on the page.
- Suggested fix direction: Throttle with `requestAnimationFrame`, attach the listener only to the relevant container, or update CSS variables/animation values outside full React renders.

### F-011: Join/recruitment pages seed rendered time from `new Date()` before hydration

- File path: `src/app/join/page.tsx`, `src/app/join/recruitment-info/page.tsx`
- Line number(s): `src/app/join/page.tsx` 11-24; `src/app/join/recruitment-info/page.tsx` 8-14, 37-40
- Category: bug
- Severity: medium
- Description: Both pages initialize rendered time state with `new Date()` during component initialization. The recruitment-info page renders that value directly, and the join page passes it to `JoinStatusBar`. Because the server/prerender time can differ from the client's first render time, these pages can trigger hydration text mismatches.
- Suggested fix direction: Use a stable initial value until mounted, then set/update the clock in `useEffect`. Alternatively isolate the clock into a client-only component that renders nothing until mounted.

### F-012: Error pages claim notification without actual reporting or logging hook

- File path: `src/app/error.tsx`, `src/app/global-error.tsx`
- Line number(s): `src/app/error.tsx` 17-29; `src/app/global-error.tsx` 17-30
- Category: stub
- Severity: low
- Description: The user-facing copy says engineers have been notified / a critical failure was detected, but neither error boundary reports to telemetry, logs the error, or includes a monitoring hook in these files. This can create a false operational signal and leave client-side failures untracked outside default framework logging.
- Suggested fix direction: Add a real error-reporting integration in these boundaries, or change the copy so it does not imply notification. Include digest and route context in telemetry while avoiding sensitive data.

## Files reviewed with no direct findings in this pass

- `src/app/about/layout.tsx`
- `src/app/about/page.tsx`
- `src/app/admin/layout.tsx`
- `src/app/contact/layout.tsx`
- `src/app/contact/page.tsx`
- `src/app/debug-profile/layout.tsx`
- `src/app/forgot-password/layout.tsx`
- `src/app/join/layout.tsx`
- `src/app/join/recruitment-info/layout.tsx`
- `src/app/layout.tsx`
- `src/app/login/layout.tsx`
- `src/app/login/page.tsx`
- `src/app/metadata.ts`
- `src/app/not-found.tsx`
- `src/app/page.tsx`
- `src/app/references/page.tsx`
- `src/app/reset-password/layout.tsx`
- `src/app/reset-profile/layout.tsx`
- `src/app/services/layout.tsx`
- `src/app/signup/layout.tsx`
- `src/app/signup/page.tsx`
- `src/app/userprofile/layout.tsx`
- `src/app/userprofile/page.tsx`
