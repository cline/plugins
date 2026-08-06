---
name: forge-app-review
description: >
  Performs a lightweight pre-release readiness review of Atlassian Forge apps across manifest/module wiring,
  architecture, runtime compatibility, dependency posture, tests, deploy readiness, and obvious security,
  cost, or reliability smells. Use when the user asks "review my Forge app", "pre-deploy check",
  "is this app ready to ship", "review manifest", "general app review", "release readiness", or asks for a
  broad quality pass. Do not use for deep security audits/SAST/exploitability review, cost optimization,
  or diagnosing a known broken app; route those to forge-security-review, forge-cost-optimizer, or
  forge-debugger respectively.
---

# Forge App Review

Run a general Forge release-readiness review. This skill is the front door for broad app review, not a replacement for specialist security, cost, or debugging skills.

## Boundaries

Use this skill for:

- Pre-deploy and release-readiness checks.
- General architecture and maintainability review.
- Manifest/module/resource/function wiring.
- Runtime, dependency, package, and script sanity checks.
- Basic tests/deploy readiness and operational hygiene.
- Obvious security, cost, or reliability smells that should trigger a deeper specialist pass.

Use another skill instead when the user's primary intent is:

- Deep security audit, SAST, authz, secrets, tenant isolation, exploitability, or CVSS reporting -> `forge-security-review`.
- Cost optimization, invocations, GB-seconds, storage/log volume, trigger frequency, or memory tuning -> `forge-cost-optimizer`.
- A known failure, error message, blank UI, failed deploy/install, broken resolver, missing app, or logs/tunnel diagnosis -> `forge-debugger`.

If a broad review finds a deep security/cost/debug concern, include it as a handoff recommendation rather than duplicating the specialist workflow.

## Review Rules

- Audit first. Do not modify app files unless the user explicitly asks to apply fixes.
- Read the codebase before making claims.
- Prefer concrete file/line evidence.
- Keep findings focused on bugs, release blockers, meaningful risks, and missing validation.
- Do not run full SAST or cost tooling from this skill. Recommend the specialist skill when warranted.
- Do not report speculative security or cost observations as confirmed vulnerabilities or savings.

## Workflow

1. Read `manifest.yml` or `manifest.yaml`.
   - Identify modules, resources, functions, resolver bindings, triggers, web triggers, remotes, permissions, runtime, and memory settings.
   - Verify referenced handlers/resources exist.
2. Read `package.json`.
   - Check Forge package fit, scripts, runtime assumptions, direct dependencies, and obvious unused/missing packages.
3. Inspect source files.
   - Backend/resolvers: `resolver.define`, handler exports, product API calls, storage usage, external fetches, logging, error handling.
   - Frontend: UI Kit or Custom UI resource entry points, `invoke()` patterns, bridge usage, loading/error states.
4. Inspect tests and project docs when present.
   - Note missing tests only when behavior risk justifies it.
5. Produce a prioritized readiness report.

## What To Check

### Release Blockers

- Manifest references a missing handler, resource path, or module key.
- Resolver names called by the frontend do not match `resolver.define()` names.
- Required scopes or egress permissions are missing for actual API/fetch usage.
- Runtime, package versions, or module syntax likely fail `forge lint`, build, deploy, or install.
- App has no clear way to exercise its primary user flow.

### Architecture And Maintainability

- Module type matches the intended UX surface.
- Resolver boundaries are coherent and not overly monolithic for the app size.
- Sensitive or privileged logic stays backend-side.
- UI-only formatting/transforms are not unnecessarily forced through backend functions.
- Error handling is sufficient for user-facing workflows.
- Code organization matches existing project style.

### Lightweight Security Signals

Only flag obvious signals and recommend `forge-security-review` for deep validation:

- Broad/write/admin scopes without visible usage.
- `api.asApp()` in user-triggered resolvers without obvious authorization checks.
- Hardcoded credentials or token-like literals.
- External fetches without manifest egress entries.
- Web triggers without visible authentication strategy.
- Full payload/request logging that may expose user, tenant, or secret data.

### Lightweight Cost Signals

Only flag obvious signals and recommend `forge-cost-optimizer` for deep analysis:

- Resolver invoked only to return static data or product context.
- Multiple independent `invoke()` calls on page load.
- Scheduled triggers that look like broad polling.
- Product triggers without filters or `ignoreSelf` where applicable.
- Full payload/API response logging in hot paths.
- Storage writes on every invocation.

### Lightweight Debuggability Signals

Only flag readiness gaps; use `forge-debugger` when there is an observed failure:

- Missing loading/error states around async UI paths.
- Logs are either too noisy or absent around important failures.
- README or scripts do not explain how to lint/build/deploy/test.
- App has no obvious local verification command besides `forge lint`.

## Output Format

Return a concise Markdown report:

```markdown
# Forge App Review Results

## Summary
- Readiness: Ready | Needs changes | Blocked
- Highest-risk area: <manifest | resolver wiring | permissions | dependencies | tests | operational hygiene>
- Files inspected: <short list>
- Specialist handoffs: <none | security | cost | debugger>

## Findings

1. [Critical | Warning | Info] <title>
   - Evidence: `<file:line>` and observed pattern
   - Impact: <why this affects readiness>
   - Recommendation: <specific fix or specialist handoff>

## Clean Areas
- <important categories checked with no issues>

## Suggested Next Step
- <apply fixes | run specialist review | deploy/lint/test command>
```

If there are no findings, say the app looks ready from this general review and list any residual specialist reviews that were intentionally out of scope.
