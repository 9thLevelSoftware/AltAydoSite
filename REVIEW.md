# Pull Request Review Guidance

Review every pull request in two passes: a normal correctness review followed by a mandatory Ponytail review. The Ponytail pass is never optional; when it finds nothing, report exactly `Ponytail: Lean already. Ship.`

The goal is a correct, secure, maintainable codebase that remains as small as practical. Prefer the laziest solution that actually works: fewer files, dependencies, abstractions, branches, and concepts.

## Review Process

### 1. Understand the intent

Read the pull request title, description, linked issue, and changed files. Identify the behavior that is supposed to change before proposing simplification.

### 2. Review correctness first

Look for bugs, broken edge cases, security issues, data-loss risks, race conditions, missing validation, inadequate error handling, broken tests, and regressions.

Do not simplify away necessary safety, input validation, security checks, accessibility, observability, tests, or behavior explicitly required by the pull request or linked issue.

### 3. Perform a dedicated Ponytail pass

Search the diff for unnecessary complexity:

- Prefer deletion over addition.
- Prefer the standard library over hand-rolled code.
- Prefer platform or framework-native features over dependencies or custom code.
- Prefer existing repository patterns over new abstractions.
- Prefer one direct implementation over factories, registries, service layers, interfaces, adapters, or configuration with only one use.
- Challenge speculative future-proofing and code added "just in case."
- Flag abstractions with only one implementation and wrappers around simple APIs.
- Flag dependencies used for trivial behavior.
- Flag helpers that duplicate language, framework, or repository functionality.
- Flag generated boilerplate or broad scaffolding not required by the pull request.
- Flag tests that primarily test mocks, framework behavior, or implementation details instead of useful behavior.
- Flag comments or documentation that explain obvious code or defend unnecessary complexity.

Do not invent findings. If the code is already simple, say so.

## Ponytail Tags and Finding Format

Use these tags:

- `delete`: dead code, unused flexibility, speculative features, unnecessary branches, unused configuration, or scaffolding.
- `stdlib`: hand-rolled behavior already provided by the language standard library.
- `native`: dependencies or custom code duplicating platform or framework functionality.
- `yagni`: abstractions, configuration, or extension points with no current need.
- `shrink`: behavior that can be expressed with materially less code.
- `reuse`: helpers that duplicate an existing repository helper or pattern.
- `test-shrink`: tests that can be simpler while preserving meaningful coverage.

Each Ponytail finding must be concise and actionable:

```text
<file>:L<line>: <tag> <what to cut>. <what replaces it>.
```

Examples:

```text
src/cache.ts:L42: stdlib: custom LRU cache. Replace with Map plus size cap, or use the existing cache helper in src/lib/cache.ts.
app/services/UserService.ts:L18: yagni: IUserService has one implementation and one caller. Delete the interface and inject UserService directly.
src/validators/email.ts:L7: native: regex-based email parser. Use the platform/email validation already used in FormInput.
tests/user.test.ts:L88: test-shrink: five mocked repository tests cover the same branch. Keep one behavior test through the public API.
src/config.ts:L31: delete: FEATURE_X_STRATEGY has one value and no callers override it. Inline the value.
```

## Boundaries

- Do not suggest removing required input validation, security checks, or error handling that prevents data loss or silent failure.
- Do not suggest removing accessibility basics.
- Do not suggest removing tests that protect non-trivial behavior.
- Do not suggest removing operationally necessary logging or metrics.
- Do not suggest removing behavior explicitly required by the pull request or linked issue.
- Do not prefer clever one-liners when a readable implementation prevents mistakes.
- Do not block a pull request merely because the code could be shorter. Block only for correctness, security, data-loss, or maintainability risks.

## Review Output

Use the following structure.

### Verdict

Choose one:

- Approve
- Request changes
- Comment only

Follow it with one short sentence explaining why.

### Correctness / Safety Findings

List only real correctness, safety, security, regression, or test issues using:

```text
<severity>: <file>:L<line>: <issue>. <required fix>.
```

Severities:

- `critical`: bug, security, or data-loss risk that must be fixed before merge.
- `important`: likely defect or maintainability hazard that should be fixed before merge.
- `minor`: small issue, typo, naming, or clarity problem.

If there are none, write exactly:

```text
No correctness or safety findings.
```

### Ponytail Review

Always include this section. List findings in the required Ponytail format. If there are none, write exactly:

```text
Ponytail: Lean already. Ship.
```

End the section with:

```text
Ponytail net: -<estimated removable lines> lines.
```

When nothing is removable, use:

```text
Ponytail net: 0 lines.
```

### Suggested Minimal Patch

When findings are actionable, describe the smallest safe patch set. Prefer the fewest changed files and deleting code. Do not add dependencies unless absolutely necessary, and do not propose a broad refactor when a local fix works. Keep this section short.

When no patch is needed, write exactly:

```text
No patch needed.
```

### Final Merge Guidance

State clearly whether the pull request can merge, for example:

- Can merge after the critical finding is fixed.
- Can merge; Ponytail suggestions are optional cleanup.
- Do not merge until tests cover the changed behavior.
- Can merge as-is.

## Reviewer Conduct

- Be direct and specific; do not write long essays or praise boilerplate.
- Do not ask authors to vaguely "consider" changes.
- Every finding must state exactly what should change.
- Mark optional simplifications as optional.
- If complexity creates real risk and simplification is required, explain that risk in one sentence.
- Never treat a tool, test, or CI self-report as proof when the diff contradicts it.
- Prefer the smallest root-cause fix over patches scattered across callers.

## Mandatory Per-PR Checklist

- Did I review correctness and security first?
- Did I run a separate Ponytail pass?
- Did I look for code to delete?
- Did I look for standard-library or native replacements?
- Did I look for one-implementation interfaces, factories, or adapters?
- Did I look for speculative configuration or extensibility?
- Did I avoid removing required validation, security checks, and tests?
- Did I include Ponytail findings or `Ponytail: Lean already. Ship.`?
