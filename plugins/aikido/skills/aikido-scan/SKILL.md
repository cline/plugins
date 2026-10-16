---
name: aikido-scan
description: Use this skill when the user asks to scan code with Aikido Security, check SAST findings, detect leaked secrets, or verify security issues in changed files.
---

# Aikido Scan

Use this skill to run Aikido scans through the `aikido-mcp` server.

## Guardrails

- Confirm scan scope before every request that sends file contents to Aikido.
- Prefer generated, added, modified, or user-selected files over broad repository scans.
- Do not scan secrets, private keys, `.env` files, customer data, or unrelated files unless the user explicitly approves.
- Respect the MCP server limit of 50 files per scan request. Batch only after confirming broad scope is intended.
- If auth or MCP availability fails, switch to `aikido-setup`.

## Scan Flow

1. Identify candidate files from the user's request, git diff, or the current task.
2. Present the scan scope and ask for approval before sending any file contents.
3. Read the approved files.
4. Call the Aikido full scan tool exposed by `aikido-mcp` with each approved file path and full content.
5. If findings are returned, summarize:
   - Title.
   - Severity.
   - File and line.
   - Why it matters.
   - A concrete remediation.
6. Apply fixes only when the user wants Cline to fix them or the current task already includes remediation.
7. Rescan changed files after fixes, up to three focused attempts. Stop earlier if the remaining result is clearly a false positive or needs user judgment.
8. Report final status and unresolved findings.

## Scope Guidance

Good default scan targets:

- Files modified in the current branch.
- Files Cline just generated or edited.
- Files named by the user.
- Security-sensitive paths such as auth, input validation, command execution, file upload, dependency manifests, or infrastructure files.

Avoid defaulting to whole-repository scans. Ask first because scan cost, runtime, and data exposure are materially different.
