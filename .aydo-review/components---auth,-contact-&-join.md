# Components - Auth, Contact & Join Review

Scope: auth forms, contact form/sections, join page sections, and admin dashboard components.

Reviewed files:
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/LoginLoading.tsx`
- `src/components/auth/SignupForm.tsx`
- `src/components/contact/ContactChannels.tsx`
- `src/components/contact/ContactFooter.tsx`
- `src/components/contact/ContactForm.tsx`
- `src/components/contact/ContactHero.tsx`
- `src/components/contact/ContactStatusBar.tsx`
- `src/components/contact/LocationSection.tsx`
- `src/components/join/BenefitsSection.tsx`
- `src/components/join/JoinCTA.tsx`
- `src/components/join/JoinHero.tsx`
- `src/components/join/JoinStatusBar.tsx`
- `src/components/join/VisionSection.tsx`
- `src/components/admin/AccessDenied.tsx`
- `src/components/admin/AdminDashboardContent.tsx`

## Summary

Findings count: 12

Severity breakdown:
- Critical: 0
- High: 0
- Medium: 7
- Low: 5

Files with no findings identified:
- `src/components/auth/LoginLoading.tsx`
- `src/components/contact/ContactChannels.tsx`
- `src/components/contact/ContactFooter.tsx`
- `src/components/contact/LocationSection.tsx`
- `src/components/join/JoinHero.tsx`
- `src/components/join/VisionSection.tsx`
- `src/components/admin/AccessDenied.tsx`

Verification notes:
- Read all 16 assigned component files in full.
- Checked related `MobiGlasButton` implementation to verify that `JoinCTA` nests anchors inside a rendered `<button>`.
- Checked `src/app/join/page.tsx` to confirm `JoinStatusBar` receives a `Date` initialized during render.
- Checked related `/api/contact` and `/api/auth/signup` route responses for form error-shape context.
- `npm run type-check -- --pretty false` is currently blocked by repository-level TypeScript configuration deprecation errors in `tsconfig.json` (`moduleResolution=node10` and `baseUrl`).
- Retried with `npx tsc --noEmit --pretty false --ignoreDeprecations 6.0`; type-check still fails globally because installed dependency/type declarations such as `react`, `next`, `next-auth`, `zod`, `mongodb`, `vitest`, and Node globals are not resolvable in this workspace. No component-specific type-check result could be obtained from those global failures.

## Findings

### 1. `src/components/auth/LoginForm.tsx`

- Line(s): 43-44, 92, 103, 106, 134, 140, 145
- Category: failure-point
- Severity: medium
- Description: The login flow logs authenticated user details, the attempted Aydo handle, the full NextAuth sign-in result, and raw authentication/session errors to the browser console. This exposes account identifiers and auth-flow internals on shared machines and in collected browser logs.
- Suggested fix direction: Remove production console logging or gate it behind a development-only logger. Avoid logging handles, user profile fields, raw auth provider responses, or raw errors in client code.

### 2. `src/components/auth/LoginForm.tsx`

- Line(s): 96-101, 128-132
- Category: bug
- Severity: medium
- Description: The submitted `callbackUrl` is validated before calling `signIn`, but the eventual navigation uses `router.push(result.url || '/')` without validating `result.url`. If NextAuth returns an absolute URL because of provider behavior, misconfiguration, or a future server-side regression, the client bypasses the local callback URL guard and navigates to whatever URL was returned.
- Suggested fix direction: Re-validate and normalize `result.url` before passing it to `router.push`, or ignore `result.url` and navigate only to the already validated callback path.

### 3. `src/components/auth/SignupForm.tsx`

- Line(s): 77-83, 87-90
- Category: failure-point
- Severity: medium
- Description: The submit handler unconditionally calls `await response.json()`. If the signup endpoint returns a non-JSON error page, an empty response, or a proxy-generated HTML error, JSON parsing throws before the `response.ok` branch can display the server-provided status context. The user then sees a generic parsing/network-style message rather than the actual signup failure.
- Suggested fix direction: Check the response content type before parsing JSON, wrap JSON parsing separately, and fall back to a status-based message when the body is empty or non-JSON.

### 4. `src/components/contact/ContactForm.tsx`

- Line(s): 51-58, 62-77
- Category: failure-point
- Severity: medium
- Description: The contact submit handler also unconditionally parses `response.json()`. Non-JSON responses from middleware, deployment infrastructure, or server crashes skip the intended `response.ok`/validation handling and collapse into the generic network-error catch path, making real service failures hard to diagnose for users.
- Suggested fix direction: Parse JSON defensively only when the content type is JSON, and preserve HTTP status/error context for non-JSON or empty responses.

### 5. `src/components/contact/ContactStatusBar.tsx`

- Line(s): 8, 10-16, 38
- Category: failure-point
- Severity: low
- Description: The component initializes `time` from `new Date()` during render and immediately formats it with `toLocaleTimeString()`. Because client components can still participate in server-rendered initial HTML, the formatted minute/timezone can differ between server and client hydration, causing text mismatch warnings or a visible clock jump.
- Suggested fix direction: Render a stable placeholder until mounted, initialize the clock inside `useEffect`, or suppress hydration only for the live clock text if that mismatch is acceptable.

### 6. `src/components/contact/ContactHero.tsx`

- Line(s): 149-187
- Category: failure-point
- Severity: low
- Description: The diagnostic panel uses a fixed horizontal `flex` layout with `w-1/3` and `w-2/3` columns and no small-screen fallback. On narrow screens the signal/progress column and log column can become cramped or overflow instead of stacking.
- Suggested fix direction: Use responsive classes such as `flex-col md:flex-row`, full-width mobile columns, and appropriate spacing so the diagnostic panel remains readable on mobile.

### 7. `src/components/join/BenefitsSection.tsx`

- Line(s): 78-80, 84, 140-150
- Category: failure-point
- Severity: low
- Description: The card detail state is driven only by mouse hover. Keyboard and touch users cannot trigger the hovered state, yet the UI advertises `// HOVER FOR MORE INFO`, so the scanline/detail affordance is unavailable on non-mouse input.
- Suggested fix direction: Add keyboard focus handlers and touch/click toggles, make the cards focusable when interactive, or avoid hiding meaningful state behind hover-only behavior.

### 8. `src/components/join/JoinCTA.tsx`

- Line(s): 69-90, 99-126
- Category: bug
- Severity: medium
- Description: The CTA buttons render `<a>` elements as children of `MobiGlasButton`. `MobiGlasButton` renders a real `<button>`, so this produces interactive anchors nested inside interactive buttons, which is invalid HTML and can cause inconsistent click behavior, accessibility tree confusion, and hydration/browser repair differences.
- Suggested fix direction: Render these CTAs as links styled like buttons, add an `asChild`/link variant to `MobiGlasButton`, or move navigation to a button `onClick` without nesting an anchor.

### 9. `src/components/join/JoinCTA.tsx`

- Line(s): 123-125
- Category: stub
- Severity: low
- Description: The `VIEW CORPORATE PROFILE` CTA points to `href="#"`, so it is a placeholder that does not navigate to a real corporate profile. Because it also opens in a new tab, users get a broken/no-op action rather than useful content.
- Suggested fix direction: Replace the placeholder with the intended profile URL, hide/disable the CTA until the destination exists, or route it to an implemented internal page.

### 10. `src/components/join/JoinStatusBar.tsx`

- Line(s): 7-11, 32
- Category: failure-point
- Severity: low
- Description: The status bar formats a live `Date` prop with `toLocaleTimeString()`. The current parent page initializes that prop with `useState(new Date())` during render, so this component can emit locale/time-dependent initial text that differs across server and client hydration.
- Suggested fix direction: Have the parent pass a stable placeholder until mounted, or make the status bar own the mounted-clock behavior and render deterministic initial text.

### 11. `src/components/admin/AdminDashboardContent.tsx`

- Line(s): 65-99, 125-134
- Category: stub
- Severity: medium
- Description: The admin dashboard presents functional-looking controls for user management, clearance management, and organization structure, but the buttons have no handlers or links. The page also explicitly says the dashboard is under development and lists core admin functionality as future work, so the admin surface is mostly placeholder UI.
- Suggested fix direction: Either wire the controls to implemented admin workflows or mark them disabled/coming-soon so operators do not mistake inert controls for working admin functions.

### 12. `src/components/admin/AdminDashboardContent.tsx`

- Line(s): 101-121
- Category: bug
- Severity: medium
- Description: The Discord integration panel hard-codes `Auto-sync Active` and `Every 6 hours` without checking the actual sync job, last run, error state, or configuration. If the background sync is disabled, failing, or misconfigured, the admin dashboard still reports a healthy state.
- Suggested fix direction: Fetch real sync health/status from an admin API, show last-run/error details, and render an unknown/offline state when status cannot be verified.
