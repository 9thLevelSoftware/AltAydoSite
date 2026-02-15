# Phase 8: MongoDB Consolidation - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Merge the application's two competing MongoDB connection modules into a single client with a unified connection pool. Eliminate the race condition in updateUser() where concurrent profile saves silently overwrite each other. All existing database operations (users, missions, ships, escorts, finance) must work identically after consolidation.

</domain>

<decisions>
## Implementation Decisions

### Conflict handling (race condition resolution)
- Use optimistic locking with a version field on documents prone to concurrent writes (starting with user profiles)
- When a stale write is detected, reject it with a clear error rather than silently overwriting
- The user experience: second save gets an error message saying data changed since they loaded it, with option to reload and retry
- This is the standard approach for web apps — no auto-merge complexity needed at this stage

### Fallback strategy
- Keep the existing local JSON fallback behavior during consolidation
- Phase 8 is about merging two MongoDB clients into one, not about removing the safety net
- The fallback system is orthogonal to connection consolidation — removing it is a separate decision for a future phase if desired

### Claude's Discretion
- Connection pool sizing details (timeouts, idle connections, retry intervals) within the 50-connection max
- Which module to keep as the canonical client vs which to deprecate
- Migration order (which storage modules to consolidate first)
- Verification approach (how to confirm all operations work identically)
- Internal module naming and export structure

</decisions>

<specifics>
## Specific Ideas

No specific requirements — user trusts Claude's judgement on all implementation decisions for this infrastructure phase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-mongodb-consolidation*
*Context gathered: 2026-02-15*
