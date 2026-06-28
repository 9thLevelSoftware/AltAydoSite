# Scripts & Data Review

Scope reviewed:
- `src/scripts/assign-synced-role.ts`
- `src/scripts/generate-password.ts`
- `src/scripts/migrate-ship-references.ts`
- `src/scripts/migrate-timezone.ts`
- `src/scripts/sync-ships.ts`
- `src/scripts/test-mongodb-connection.ts`
- `src/scripts/verify-email-config.ts`
- `src/data/StarCitizenLocations.ts`

## Findings

### 1. Discord member lookup refetches the full guild for each unresolved user
- File path: `src/scripts/assign-synced-role.ts`
- Line number(s): 91-92
- Category: failure-point
- Severity: medium
- Description: For every user without `discordId`, the script calls `discord.getMemberByName()`. The Discord service implementation fetches the full guild member list for each call, so a large user set can repeatedly download the same member cache and trigger Discord rate limits or make the script impractically slow.
- Suggested fix direction: Fetch guild members once before the loop, build username/display-name lookup maps, and resolve all missing IDs from that local cache.

### 2. Invalid delay configuration silently disables pacing
- File path: `src/scripts/assign-synced-role.ts`
- Line number(s): 57, 127-128
- Category: failure-point
- Severity: medium
- Description: `parseInt(process.env.ROLE_ASSIGN_DELAY_MS || '750', 10)` is not validated. If the env var is set to a non-numeric value, `PER_USER_DELAY_MS` becomes `NaN`; the `> 0` check then skips all delay, removing the rate-limit protection for Discord role assignment.
- Suggested fix direction: Validate with `Number.isFinite()` and fall back to the default, or fail fast on invalid configuration.

### 3. Discord client is not cleaned up on fatal pre-loop errors
- File path: `src/scripts/assign-synced-role.ts`
- Line number(s): 79-83, 134, 138-140
- Category: error
- Severity: low
- Description: `discord.cleanup()` is only called after the user loop completes. If `initializeBot()`, `ensureRoleByName()`, or another fatal path before line 134 throws, the top-level catch exits without destroying the Discord client.
- Suggested fix direction: Wrap Discord initialization and processing in `try/finally` and call `cleanup()` whenever the client was created.

### 4. Password generator defaults to and prints a known plaintext password
- File path: `src/scripts/generate-password.ts`
- Line number(s): 3-14
- Category: bug
- Severity: high
- Description: Running the script without an argument hashes the hardcoded password `password123`, and the script prints the plaintext password to stdout. This creates a high-risk footgun for accidentally provisioning a known password and leaks any provided password into terminal logs/CI logs.
- Suggested fix direction: Require an explicit password argument or secure stdin prompt, refuse the known default, and avoid printing plaintext secrets.

### 5. Password hash failures are reported as success to callers
- File path: `src/scripts/generate-password.ts`
- Line number(s): 18-20
- Category: failure-point
- Severity: low
- Description: The catch block logs the hashing error but does not set `process.exitCode` or rethrow. Automation invoking the script can see exit code 0 despite no usable hash being generated.
- Suggested fix direction: Set `process.exitCode = 1` or rethrow after logging.

### 6. Mission migration cannot update current MongoDB mission documents reliably
- File path: `src/scripts/migrate-ship-references.ts`
- Line number(s): 229, 252-256
- Category: bug
- Severity: high
- Description: The migration reads raw MongoDB mission documents and then uses `mission.id` for both reporting and `updateOne({ id: mission.id })`. Current mission creation stores MongoDB `_id` as the canonical ID in responses and does not persist an `id` field inside the document. For those documents, `mission.id` is undefined, the update filter does not target the source document, and the script still increments `updated` without checking `matchedCount`.
- Suggested fix direction: Use the document `_id` from the fetched record or the same ID-filter helper used by mission storage, and verify `matchedCount`/`modifiedCount` before counting an update as successful.

### 7. Planned mission migration has the same raw-document ID mismatch
- File path: `src/scripts/migrate-ship-references.ts`
- Line number(s): 336, 359-363
- Category: bug
- Severity: high
- Description: Planned mission documents are fetched raw from MongoDB, but the script reports and updates by `mission.id`. Current planned mission creation stores the Mongo `_id` and returns it as response `id`; it does not persist a separate `id` field in the document. The migration can therefore fail to update planned missions while still incrementing `updated`.
- Suggested fix direction: Update by `_id` or a shared `createIdFilter` equivalent, and treat `matchedCount === 0` as a failed migration for that document.

### 8. Ship migration summary double-counts skipped records
- File path: `src/scripts/migrate-ship-references.ts`
- Line number(s): 115, 158, 219, 265, 326, 372, 452, 485
- Category: bug
- Severity: low
- Description: Already-migrated ship entries increment `collectionReport.skipped` inside the per-ship/per-participant loop, and the containing document increments `skipped` again when `anyUpdated` remains false. Reports can show skipped counts greater than the number of processed documents, making dry-run/live summaries misleading.
- Suggested fix direction: Track document-level skipped counts separately from field-level already-migrated counts, or only increment `skipped` once per document.

### 9. Timezone migration exits successfully after failed per-user updates or failed verification
- File path: `src/scripts/migrate-timezone.ts`
- Line number(s): 23-31, 48-55, 119-120
- Category: bug
- Severity: high
- Description: Individual `updateUser` failures are caught and logged but not accumulated. The verification block only prints users still missing timezones and then `main()` exits with code 0. A partially failed migration can therefore be treated as successful by operators or deployment automation.
- Suggested fix direction: Count failed updates and verification misses; set a non-zero exit code or throw if any user remains unmigrated.

### 10. Timezone test mode permanently changes real user data
- File path: `src/scripts/migrate-timezone.ts`
- Line number(s): 63-101, 78-83
- Category: bug
- Severity: medium
- Description: `testTimezonePersistence()` writes `America/New_York` to the selected user and never restores the user's original timezone. Running `npm run migrate-timezone test <userHandle>` is described as a test but mutates production-like user data permanently.
- Suggested fix direction: Restore the original timezone in a `finally` block, or require an explicit destructive flag and clearly label the command as a write test.

### 11. Partial ship syncs are reported as successful process exits
- File path: `src/scripts/sync-ships.ts`
- Line number(s): 19-25
- Category: failure-point
- Severity: medium
- Description: The wrapper only sets a non-zero exit code when `result.status === 'failed'`. The sync library returns `partial` for validation errors, fetch errors, mirror errors, and deferred ships. Cron/CI callers will treat those partial runs as successful even though the printed summary contains skipped/deferred/error data.
- Suggested fix direction: Decide whether `partial` should fail the external job; if operators need intervention, set a non-zero exit code for `partial` or add an explicit `--allow-partial` mode.

### 12. MongoDB test script prints full sample user records
- File path: `src/scripts/test-mongodb-connection.ts`
- Line number(s): 87-95
- Category: error
- Severity: high
- Description: The script fetches users with only `_id` excluded and prints `users[0]` as full JSON. That can expose password hashes, emails, Discord IDs, profile data, and other PII/secrets in terminal or CI logs.
- Suggested fix direction: Use a restrictive projection for non-sensitive fields only, or print only the count and a redacted/schema-only sample.

### 13. MongoDB test script can log a top-level failure and still exit 0
- File path: `src/scripts/test-mongodb-connection.ts`
- Line number(s): 108-109
- Category: failure-point
- Severity: low
- Description: The top-level invocation uses `.catch(console.error)` without setting a non-zero exit code. Errors thrown outside the inner `try/catch` path can be logged while the process exits successfully.
- Suggested fix direction: Replace with a catch handler that logs and sets `process.exitCode = 1` or calls `process.exit(1)`.

### 14. Email verification loads `.env.local` after importing the email service
- File path: `src/scripts/verify-email-config.ts`
- Line number(s): 1-6
- Category: bug
- Severity: critical
- Description: ES module imports execute before the script body. `verifyEmailConfig` is imported before `dotenv.config()` runs, and `src/lib/email-service.ts` builds its `emailConfig` object at module load time from `process.env`. When this script is run with settings only in `.env.local`, the later required-variable check sees the variables, but `verifyEmailConfig()` can still use the stale undefined config captured during import.
- Suggested fix direction: Load dotenv before importing the email service, or change the email service to build its config inside `createTransporter()` so it reads current environment values at call time.

### 15. Email port value is not validated before SMTP verification
- File path: `src/scripts/verify-email-config.ts`
- Line number(s): 11-19, 22-28
- Category: failure-point
- Severity: low
- Description: The script checks that `EMAIL_PORT` exists but does not validate that it is numeric or in a valid TCP port range before calling the email service. Misconfigured values surface later as less actionable transport errors.
- Suggested fix direction: Parse and validate `EMAIL_PORT` up front, and fail fast with a configuration-specific error.

### 16. Pyro body options hide canonical names behind designations
- File path: `src/data/StarCitizenLocations.ts`
- Line number(s): 78-97, 151-157, 166-191
- Category: bug
- Severity: medium
- Description: For bodies with `designation`, the planet option value/label uses only the designation (`Pyro II`, `Pyro III`, `Pyro VI`) instead of the canonical names `Monox`, `Bloom`, and `Terminus`. Child entries use `planet.name`, so the same body can appear under different labels; for example `Terminus` is also represented as `Pyro VI` elsewhere. Users searching/selecting by canonical location names can miss expected options.
- Suggested fix direction: Include both designation and canonical name in labels/aliases, and keep parent/child labels consistent.

### 17. Pyro IV is modeled as a planet even though the data says it is a moon
- File path: `src/data/StarCitizenLocations.ts`
- Line number(s): 85-88, 149-160
- Category: bug
- Severity: medium
- Description: The data comment/designation says `Pyro IV (Moon of Pyro V)`, but it is stored in the `planets` array and emitted as a `type: 'planet'` option. Consumers filtering by `type` or grouping moons under their parent will show an incorrect hierarchy.
- Suggested fix direction: Represent Pyro IV as a moon/child of Pyro V or add a richer body type that can preserve moon/planet hierarchy correctly.

### 18. Ruin Station is emitted twice with inconsistent parents
- File path: `src/data/StarCitizenLocations.ts`
- Line number(s): 95-100, 186-210
- Category: bug
- Severity: low
- Description: `Ruin Station` is listed both as a station on the `Terminus` planet entry and as a system-level station orbiting `Pyro VI`. `getLocationOptions()` emits both `Pyro - Terminus - Ruin Station` and `Pyro - Pyro VI - Ruin Station`, creating duplicate choices for the same station with different parent labels.
- Suggested fix direction: Keep a single source of truth for each station or deduplicate generated options by canonical station/body identity.

## Summary

Findings count: 18

Severity breakdown:
- Critical: 1
- High: 5
- Medium: 7
- Low: 5

No source code was modified; this file only documents review findings.
