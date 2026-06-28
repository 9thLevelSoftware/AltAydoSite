# Consolidated AltAydoSite Review Report

Repository: `~/AltAydoSite`
Source artifacts: 17 review markdown files under `~/AltAydoSite/.aydo-review/`

## Executive summary

This synthesis covers 365 findings across the full review set. The overall risk profile is dominated by authorization gaps, storage consistency/fallback problems, and request/response validation issues. Two critical findings were reported: an unauthenticated Discord init endpoint when `INIT_SECRET` is missing, and a timezone migration script that can silently succeed after partial failure.

The highest-risk areas are the fleet-ops and mission APIs, core storage/auth libraries, Discord integration, and the scripts that mutate live data. The most common failure pattern is a route or helper that fails open when configuration, identity, or storage assumptions are missing. A close second is inconsistent storage behavior between MongoDB and local fallback paths, which can create stale reads, duplicate records, or writes that appear successful but are not.

## Overall counts

| Metric | Count |
| --- | ---: |
| Total findings | 365 |
| Critical | 2 |
| High | 79 |
| Medium | 184 |
| Low | 100 |

## Category mix

Across the published review artifacts, the findings concentrate heavily in two classes: bug and failure-point. Stub findings are also significant, usually indicating placeholder behavior that reports success too early or does not implement the documented path. Error findings are the smallest group, but they still matter because they frequently turn client mistakes into 500s or leak confusing operational signals.

| Category | Count |
| --- | ---: |
| Bug | 111 |
| Failure-point | 164 |
| Error | 26 |
| Stub | 23 |

## Area breakdown

| Review area | Findings | Severity pattern |
| --- | ---: | --- |
| Components - Services, Security & Profile | 42 | 7 high / 26 medium / 9 low |
| API Routes - Fleet Ops & Missions | 36 | 15 high / 15 medium / 6 low |
| API Routes - Cron & Misc | 34 | 6 high / 18 medium / 10 low |
| Core Library | 32 | 12 high / 16 medium / 4 low |
| Components - Dashboard | 30 | 0 high / 16 medium / 14 low |
| Hooks & Types | 22 | 4 high / 13 medium / 5 low |
| Ship & Mission Libraries | 21 | 6 high / 10 medium / 5 low |
| API Routes - Auth | 19 | 7 high / 8 medium / 4 low |
| API Routes - Discord & Events | 18 | 1 critical / 4 high / 8 medium / 5 low |
| Dashboard Pages | 18 | 3 high / 6 medium / 9 low |
| Scripts & Data | 18 | 1 critical / 5 high / 7 medium / 5 low |
| Components - Ships & Fleet | 14 | 4 high / 7 medium / 3 low |
| Components - About & Landing | 13 | 8 medium / 5 low |
| MobiGlas UI System | 13 | 9 medium / 4 low |
| Public Pages | 12 | 3 high / 4 medium / 5 low |
| Components - Auth, Contact & Join | 12 | 7 medium / 5 low |
| Build & Config | 11 | 3 high / 6 medium / 2 low |

## Top risk themes

1. Authorization is too often inferred from optional session fields, client checks, or hard-coded shortcuts instead of a single fail-closed guard.
2. Several storage helpers and migration scripts can return success while only partially updating data, or can fall back to a local backend that diverges from MongoDB.
3. Multiple routes mutate shared state without transactions, uniqueness checks, or race protection.
4. A number of scripts and routes misclassify client errors, malformed JSON, or partial failures as server success.
5. The UI review set still contains placeholder pages, stale content, and accessibility/semantic issues that should be cleaned up after the critical security and storage work.

## Top 20 action items

1. Fail closed in `src/app/api/discord/init/route.ts` whenever `INIT_SECRET` is missing; do not allow an unset secret to authenticate the endpoint.
2. Centralize Discord authorization in the roles/user routes so a missing `clearanceLevel` cannot pass the gate via JavaScript comparison rules.
3. In the auth callback, require a verified internal user record before issuing or refreshing a session token.
4. Revoke stale JWT sessions when the backing user is deleted, disabled, or otherwise no longer resolvable.
5. Protect fleet-ops mission list/create/update/delete with real ownership or leadership checks; remove the current “any authenticated user” behavior.
6. Lock down the fleet-ops `force-fallback` control so only explicit admin/leadership actors can change process-wide storage mode.
7. Fix `src/app/api/fleet-ops/operations/upload-image/route.ts` and the image fetch route to require mission-level authorization before accepting or returning bytes.
8. Add unique normalized identity constraints for users (`emailLower`, `aydoHandleLower`, `discordId`) and reject duplicate records at storage level.
9. Stop the user-storage fallback from permanently switching the whole process to local JSON after one transient MongoDB error.
10. Make operation/resource/mission writes transactional or conditional so concurrent requests cannot double-book resources or ships.
11. Hash password-reset tokens at rest and consume them atomically so two concurrent reset requests cannot both succeed.
12. Change the auth/rate-limit helpers to fail closed on store outages and only trust forwarded IP data from a trusted proxy path.
13. Repair the password generator so it never defaults to or prints a known plaintext password.
14. Fix the timezone migration and ship/mission migration scripts so partial failure does not exit successfully and document IDs are updated correctly.
15. Move the dashboard subtree auth check to a server-side boundary and remove the unauthenticated debug/reset routes from general builds.
16. Replace placeholder/stub pages and dry-run endpoints with either real implementations or explicit non-production responses.
17. Eliminate request/response parsing footguns: malformed JSON should return 400, invalid ObjectIds should return 400, and invalid page/pageSize values should be clamped.
18. Align the Mongo index definitions and storage helpers with the actual document fields they query or mutate.
19. Remove render-time randomness, stale timestamps, and unsafe interactive nesting from the component library so the UI behaves deterministically and accessibly.
20. Audit middleware, CSP, SVG handling, and deployment workflows so they fail closed rather than warning-and-continuing when security assumptions are unmet.

## Notes

- The reports are already well-scoped and readable, so this document is a synthesis only; it does not modify source code.
- The largest concentrations of high-severity findings are in fleet-ops/mission APIs and the core library/auth storage layer, so those should be treated as the first remediation wave.
