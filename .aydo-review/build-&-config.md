# Build & Config Review

Task: t_1f7e74f6
Repository: ~/AltAydoSite
Scope: package.json, tsconfig, ESLint, Next.js config, Tailwind, PostCSS, Vitest, middleware, instrumentation, metadata, and CI workflows.

## Summary

Findings count: 11

Severity breakdown:
- Critical: 0
- High: 3
- Medium: 6
- Low: 2

Category breakdown:
- Bug: 2
- Stub: 1
- Error: 0
- Failure-point: 8

## Findings

### 1. SVG optimization is enabled without SVG-specific download/CSP hardening

- File path: next.config.js
- Line number(s): 16-18
- Category: failure-point
- Severity: high
- Description: `images.dangerouslyAllowSVG` is enabled, but the image config does not set an SVG-specific `contentSecurityPolicy` or `contentDispositionType`. If an allowed remote image origin or local SVG path ever serves attacker-controlled SVG, the optimized image endpoint can deliver active SVG content in a browser context. Next.js explicitly treats this option as dangerous unless paired with CSP/download hardening.
- Suggested fix direction: Disable SVG optimization unless it is required. If SVG optimization must remain enabled, add an image `contentSecurityPolicy` such as `default-src 'self'; script-src 'none'; sandbox;` and set `contentDispositionType: 'attachment'` for SVG responses.

### 2. Production CSP permits inline scripts globally

- File path: next.config.js
- Line number(s): 87-108, especially 96-100
- Category: failure-point
- Severity: medium
- Description: The global Content-Security-Policy contains `script-src 'self' 'unsafe-inline' ...` in both development and production. This weakens CSP as an XSS mitigation because any injected inline script can execute. The development-only branch only adds `unsafe-eval`; it does not remove `unsafe-inline` for production.
- Suggested fix direction: Move production to nonce- or hash-based inline script allowances, or otherwise split dev/prod CSP so `unsafe-inline` is not present in production. Keep any required third-party script hosts explicit.

### 3. Admin route protection in middleware only verifies authentication, not authorization

- File path: src/middleware.ts
- Line number(s): 5-10, 20-36
- Category: failure-point
- Severity: medium
- Description: `/admin` is listed as a protected route, but the middleware only checks that a NextAuth token exists. It does not enforce an admin/role/clearance claim before allowing the request through. The current admin page appears to do additional checks, but the middleware itself would allow any authenticated user to reach all `/admin` route handlers/pages added later unless each one repeats authorization correctly.
- Suggested fix direction: Treat middleware as a defense-in-depth authorization gate for `/admin`; include role/clearance claims in the JWT and reject or redirect users who lack the required admin permission. Keep page/API-level checks as the final authority.

### 4. Login callback loses query string on protected routes

- File path: src/middleware.ts
- Line number(s): 29-32, 39-43
- Category: bug
- Severity: low
- Description: When redirecting unauthenticated users to `/login`, the middleware stores only `pathname` as `callbackUrl`. Any query string on a protected URL is dropped. Links such as filtered dashboard views, selected tabs, or operation IDs carried in query parameters will not be restored after login.
- Suggested fix direction: Use `request.nextUrl.pathname + request.nextUrl.search` or the full safe relative URL for `callbackUrl`, while continuing to avoid open redirects.

### 5. Instrumentation imports and starts the ship-sync scheduler without local error containment

- File path: src/instrumentation.ts
- Line number(s): 10-16
- Category: failure-point
- Severity: medium
- Description: `register()` dynamically imports `./lib/ship-sync` and calls `startShipSyncCron()` whenever `NEXT_RUNTIME === 'nodejs'`. If that import or startup path throws, the instrumentation hook can fail server startup. The import also happens even when the cron feature is disabled inside `startShipSyncCron`, pulling scheduler dependencies into startup unnecessarily.
- Suggested fix direction: Gate the import in `instrumentation.ts` on the same opt-in environment variable used by the scheduler, and wrap import/startup in a try/catch that logs a startup warning/error without taking down unrelated web serving.

### 6. ESLint config intentionally downgrades TypeScript safety rules that can hide real defects

- File path: .eslintrc.js
- Line number(s): 16-23
- Category: stub
- Severity: low
- Description: The config downgrades `@typescript-eslint/no-explicit-any`, `no-unused-vars`, `no-require-imports`, `no-empty-object-type`, and `prefer-const` to warnings because of pre-existing legacy violations. Since Next builds only fail on lint errors, these classes of issues can continue to ship indefinitely and new violations are not distinguished from the legacy baseline.
- Suggested fix direction: Convert this to a tracked baseline/migration plan: keep only narrowly scoped overrides for known legacy files, fail new violations in changed code, and gradually ratchet the rules back to errors.

### 7. Scheduled ship-sync workflow can falsely pass when baseline status cannot be read

- File path: .github/workflows/ship-sync.yml
- Line number(s): 52-63, 90-113, 130-132
- Category: bug
- Severity: medium
- Description: If the baseline `/api/ships/sync-status` request fails, the workflow logs a warning and assumes `baseline_version=0`. The later poll treats any existing `syncVersion > 0` as completion for this run. That can mark the scheduled job successful even if the newly triggered sync never ran, as long as the deployed app already had an older non-zero sync version.
- Suggested fix direction: Fail the workflow when the baseline cannot be read, or correlate the trigger to a run-specific ID/timestamp returned by the async endpoint instead of comparing against a fallback version of zero.

### 8. Production deploy workflow treats post-deploy sync and image warm failures as non-blocking warnings

- File path: .github/workflows/main_aydocorp.yml
- Line number(s): 120-131, 186-207, 210-252, 255-272
- Category: failure-point
- Severity: medium
- Description: The production deploy job triggers ship sync and image warming after Azure deployment, but HTTP failures, failed sync status, timeout waiting for a new status, and warm-up errors are logged as warnings while the deployment remains successful. If fresh ship data or warmed mirrored images are required for a good release, CI will report green after shipping a partially initialized deployment.
- Suggested fix direction: Decide whether these tasks are release gates. If they are required, fail the deploy job on failed sync/warm-up. If they are best-effort, move them to a separate non-required workflow/job and make the production deploy summary explicitly state that post-deploy data refresh may have failed.

### 9. Production deploy workflow shares the same baseline false-positive risk as the scheduled ship-sync workflow

- File path: .github/workflows/main_aydocorp.yml
- Line number(s): 173-183, 210-234, 250-252
- Category: failure-point
- Severity: medium
- Description: The production deploy's post-deploy ship-sync block also falls back to `baseline_version=0` when baseline status cannot be read. If a previous sync has already published any version above zero, the polling loop can treat stale status as evidence that the new post-deploy sync completed.
- Suggested fix direction: Require a readable baseline before polling, or use a run-specific async sync identifier/timestamp so the workflow verifies the sync triggered by this deployment rather than any historical sync.

### 10. Cloudflare R2 PR check validates production and explicitly passes when the endpoint is missing

- File path: .github/workflows/cloudflare-r2-pr-check.yml
- Line number(s): 3-7, 13-17, 25-42
- Category: failure-point
- Severity: high
- Description: The PR workflow does not build or run the pull-request code. It calls the deployed app URL from `NEXTAUTH_URL`, so the result reflects the current production deployment rather than the PR changes. It also exits successfully on HTTP 404, meaning a missing health endpoint can pass the check.
- Suggested fix direction: For PRs, build the candidate branch and run the R2 health logic locally or against a preview deployment for that SHA. Remove the 404 success path once the endpoint exists, or make it conditional only during a one-time rollout with an expiry.

### 11. Working-branch Azure workflow uses non-reproducible install and deploys the whole workspace

- File path: .github/workflows/working_branch_aydotest.yml
- Line number(s): 21-30, 32-36, 58-64
- Category: failure-point
- Severity: high
- Description: The test deployment workflow uses `npm install` instead of `npm ci`, then uploads `path: .` and deploys that entire workspace to Azure. This makes the build less reproducible than the production workflow and ships source, tests, CI files, dev dependencies, and any generated local artifacts that are not excluded by the artifact action.
- Suggested fix direction: Mirror the production workflow: use `actions/setup-node@v4` with npm cache, run `npm ci`, build a minimal deployment artifact from the standalone Next output/public assets/package metadata, and deploy only that artifact.

## Files reviewed with no findings

- package.json
- tsconfig.json
- tailwind.config.js
- postcss.config.js
- vitest.config.ts
- src/app/metadata.ts

## Verification notes

- Read all 14 assigned files in full with line numbers.
- Parsed all four workflow YAML files successfully.
- Extracted every workflow `run:` block and checked shell syntax with `bash -n`; all checked blocks parsed successfully.
- Confirmed `node_modules` is absent in this checkout, so local `npm run lint` could not execute here (`next: command not found`). Verified separately that `next@15.5.12` still exposes the `next lint` command, so no finding was filed for the lint script itself.
