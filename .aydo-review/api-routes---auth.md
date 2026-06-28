# API Routes - Auth Review

Task: review auth API routes: NextAuth, signup, forgot/reset password.

Reviewed files:
- `src/app/api/auth/[...nextauth]/route.ts` - no findings.
- `src/app/api/auth/auth.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/auth/signup/route.ts`

Summary:
- Total findings: 19
- Critical: 0
- High: 7
- Medium: 8
- Low: 4

## Findings

### 1. Discord OAuth can link or create accounts with a blank email
- File path: `src/app/api/auth/auth.ts`
- Line number(s): 123-126, 140-160
- Category: bug
- Severity: high
- Description: When Discord does not supply an email, the callback looks up an existing user with `user.email || ''` and creates new OAuth users with `email: user.email || ''`. Multiple no-email Discord sign-ins can collide on the empty email value, and an existing local account with an empty email could be linked to an unrelated Discord account.
- Suggested fix direction: Do not perform email-based linking when the provider email is missing or unverified. Require a verified email before linking, otherwise link only by Discord ID and reject/signpost users who cannot provide a usable email. Enforce uniqueness on non-empty normalized emails.

### 2. Discord role-derived clearance is computed but never persisted
- File path: `src/app/api/auth/auth.ts`
- Line number(s): 114-118, 135-138, 152-154
- Category: bug
- Severity: medium
- Description: `syncDiscordProfile()` returns `clearanceLevel`, but the update/create payloads only persist division, position, and pay grade. Users' session clearance therefore stays at the old database value or the hard-coded `1`, even when synced Discord roles imply a different clearance.
- Suggested fix direction: Decide the source of truth for Discord-derived authorization and either persist `discordProfileData.clearanceLevel` during both update and create, or explicitly avoid computing it here. If persisted, add guardrails so Discord role sync cannot unintentionally escalate users.

### 3. Discord OAuth can fall back to a session without a verified internal user record
- File path: `src/app/api/auth/auth.ts`
- Line number(s): 197-207
- Category: failure-point
- Severity: high
- Description: If the JWT callback cannot find the just-signed-in Discord user in storage, it still returns a valid user token using the Discord provider ID as `token.id` and default role/clearance values. Downstream code expects `session.user.id` to be the application's internal user id, so this can create authenticated sessions that are not backed by a real application user record.
- Suggested fix direction: Fail the sign-in/session creation when the internal user record cannot be loaded. Remove the provider-profile fallback, or mark the token invalid and force re-authentication after storage recovers.

### 4. Deleted or disabled users can keep using stale JWT sessions
- File path: `src/app/api/auth/auth.ts`
- Line number(s): 223-247
- Category: failure-point
- Severity: high
- Description: After the one-hour refresh interval, the JWT callback tries to reload the user but returns the existing token when the user no longer exists or when the storage lookup fails. With `session.maxAge` set to 30 days, a deleted/deactivated user or a user whose permissions were revoked can continue using the stale JWT until it expires.
- Suggested fix direction: If the user id cannot be found on refresh, invalidate the token/session. Consider adding a user `sessionVersion`, `disabledAt`, or `updatedAt` claim so password changes and account disablement revoke existing JWTs deterministically.

### 5. Login rate limiting fails open when the rate-limit store is unavailable
- File path: `src/app/api/auth/auth.ts`
- Line number(s): 42-54
- Category: failure-point
- Severity: medium
- Description: A MongoDB/rate-limit-store error is logged and the login attempt is allowed. If user storage remains available while the rate-limit collection is down, brute-force attempts are no longer throttled.
- Suggested fix direction: Fail closed for authentication rate-limit store errors, or use a local in-memory fallback limiter with conservative thresholds. Return an explicit retry response rather than silently disabling protection.

### 6. Forgot-password rate limiting fails open
- File path: `src/app/api/auth/forgot-password/route.ts`
- Line number(s): 16-35
- Category: failure-point
- Severity: medium
- Description: If the rate-limit check throws, the route logs a warning and continues. During rate-limit-store outages, attackers can send unlimited reset-email attempts, which can be used for mailbox flooding and operational abuse.
- Suggested fix direction: Fail closed or use a local fallback limiter when the persistent rate-limit store is unavailable. Keep the response generic but still throttle the request path.

### 7. Existing-account email delivery failures can enable email enumeration
- File path: `src/app/api/auth/forgot-password/route.ts`
- Line number(s): 57-78
- Category: failure-point
- Severity: medium
- Description: Non-existent emails always receive a 200 response, but existing emails return a 500 if `sendPasswordResetEmail()` fails. During SMTP outages or recipient-specific send failures, attackers can distinguish registered addresses from unregistered ones.
- Suggested fix direction: Return the same generic 200 response for all forgot-password outcomes and alert/log delivery failures internally. Avoid exposing whether a reset email was actually attempted or delivered.

### 8. Reset tokens remain valid when email delivery fails
- File path: `src/app/api/auth/forgot-password/route.ts`
- Line number(s): 67-78
- Category: failure-point
- Severity: medium
- Description: The route creates and stores a reset token before sending the email. If email delivery fails, the route returns 500 but leaves the fresh token in storage until expiry. That token is not usable by the legitimate user but remains a valid credential if it leaks through logs, storage, or debugging.
- Suggested fix direction: Delete or mark the token used when email delivery fails, or create tokens through a flow that atomically records only successfully dispatched reset attempts.

### 9. Malformed forgot-password JSON is reported as a server error
- File path: `src/app/api/auth/forgot-password/route.ts`
- Line number(s): 38-45, 90-95
- Category: error
- Severity: low
- Description: `request.json()` is inside the broad catch block, so malformed JSON produces the generic 500 response instead of a client-side 400 validation error. This makes bad requests look like server failures and can add noise to production error monitoring.
- Suggested fix direction: Parse JSON in a small try/catch and return a 400 response for invalid JSON before schema validation.

### 10. Reset-password rate limiting fails open
- File path: `src/app/api/auth/reset-password/route.ts`
- Line number(s): 21-40
- Category: failure-point
- Severity: medium
- Description: If the rate-limit check throws, the reset endpoint continues. Reset tokens are high entropy, but this still removes abuse protection for repeated invalid-token and password-reset attempts during rate-limit-store outages.
- Suggested fix direction: Fail closed or use a local fallback limiter for reset-password requests when the persistent limiter is unavailable.

### 11. Password reset token consumption is non-atomic and raceable
- File path: `src/app/api/auth/reset-password/route.ts`
- Line number(s): 59-89, 102-120
- Category: bug
- Severity: high
- Description: The route reads the reset token, separately checks `used`, updates the password, and only then marks the token as used. Two concurrent requests with the same valid token can both pass the `used` check before either marks it, allowing a single reset link to be used multiple times and producing last-writer-wins password changes.
- Suggested fix direction: Consume the token atomically before changing the password, for example with a single conditional update (`id`, `used: false`, `expiresAt > now`) or a transaction that marks the token used and updates the password together.

### 12. Password reset succeeds even if marking the token used fails
- File path: `src/app/api/auth/reset-password/route.ts`
- Line number(s): 105-120
- Category: failure-point
- Severity: high
- Description: After updating the password, the route calls `markTokenAsUsed(resetToken.id)` but ignores the returned boolean and any storage fallback semantics. If marking the token fails or returns false, the endpoint still returns success and the token may remain reusable.
- Suggested fix direction: Treat token consumption as part of the critical path. Verify that the token was marked used, and roll back/reject the password update if token consumption fails. Prefer an atomic consume-and-update flow.

### 13. Password reset does not invalidate existing sessions
- File path: `src/app/api/auth/reset-password/route.ts`
- Line number(s): 102-127
- Category: failure-point
- Severity: medium
- Description: Resetting the password only updates `passwordHash`. Existing NextAuth JWT sessions remain valid until their normal expiry, so a compromised browser/session can remain authenticated after the account owner resets the password.
- Suggested fix direction: Add a session invalidation mechanism, such as updating a `sessionVersion`/`passwordChangedAt` field and checking it in the JWT/session callbacks, or otherwise force sign-out of existing sessions after password reset.

### 14. Malformed reset-password JSON is reported as a server error
- File path: `src/app/api/auth/reset-password/route.ts`
- Line number(s): 43-50, 128-133
- Category: error
- Severity: low
- Description: Invalid JSON thrown by `request.json()` is handled by the broad catch and returned as a generic 500 instead of a 400 bad request. This misclassifies client errors as server failures.
- Suggested fix direction: Parse JSON separately and return a 400 response for invalid JSON before running the Zod schema validation.

### 15. Signup rate limiting fails open
- File path: `src/app/api/auth/signup/route.ts`
- Line number(s): 25-44
- Category: failure-point
- Severity: medium
- Description: If the persistent rate-limit store errors, the signup endpoint logs a warning and continues. That leaves account creation exposed to automated abuse during MongoDB/rate-limit-store outages.
- Suggested fix direction: Fail closed or apply a conservative local fallback limiter when signup rate-limit persistence is unavailable.

### 16. Signup duplicate checks are vulnerable to race conditions
- File path: `src/app/api/auth/signup/route.ts`
- Line number(s): 63-84, 124-127
- Category: bug
- Severity: high
- Description: The route checks handle and email availability with separate reads, then later inserts the user. Concurrent requests can both pass the checks and create duplicate handles/emails unless the database enforces unique constraints. The surrounding repository indexes for `emailLower` and `aydoHandleLower` are non-unique, so the route cannot rely on storage to reject duplicates.
- Suggested fix direction: Add unique indexes on normalized email and handle fields, perform creation in a way that handles duplicate-key errors, and return 409 when the insert fails because another request won the race.

### 17. Signup can report success after falling back to local storage
- File path: `src/app/api/auth/signup/route.ts`
- Line number(s): 124-143
- Category: failure-point
- Severity: high
- Description: `userStorage.createUser()` can fall back to local file storage when MongoDB writes fail, and this route returns a normal 201 response. In production, that can create accounts in process-local/non-authoritative storage even though credentials auth later blocks fallback storage, leaving users with apparently successful but unusable or non-durable accounts.
- Suggested fix direction: In production, fail closed when user storage is in fallback mode or when the canonical database write fails. Return a 503/500 and avoid creating accounts in fallback storage unless explicitly intended for development.

### 18. Signup logs personally identifiable request data
- File path: `src/app/api/auth/signup/route.ts`
- Line number(s): 48, 65-79, 108, 126-128
- Category: failure-point
- Severity: low
- Description: The route logs user emails, handles, and generated user ids during registration. These values are not secrets, but they are account identifiers and can become sensitive in centralized logs or incident exports.
- Suggested fix direction: Reduce log detail for public auth endpoints. Log stable request ids and event types, and include account identifiers only when needed at debug level or in access-controlled audit logs.

### 19. Signup accepts untrimmed and weakly bounded profile identifiers
- File path: `src/app/api/auth/signup/route.ts`
- Line number(s): 11-18, 61-62, 111-122
- Category: failure-point
- Severity: low
- Description: `aydoHandle`, `discordName`, and `rsiAccountName` are accepted without trimming, maximum lengths, or character constraints. Handles made of leading/trailing whitespace or unusual control characters can pass validation, create confusing duplicate-looking accounts, and cause display or lookup edge cases.
- Suggested fix direction: Normalize and trim input before validation. Add explicit maximum lengths and allowed-character rules for account identifiers, and store/display canonical forms consistently.
