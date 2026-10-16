---
name: base44-troubleshooter
description: Troubleshoot production issues using backend function logs. Use when investigating app errors, debugging function calls, or diagnosing production problems in Base44 apps.
---

# Troubleshoot Production Issues

## Cline Compatibility

Use local code/config review and user-provided redacted log excerpts before live production log reads. Run `npx base44` commands only after the user approves the exact command. Keep log queries bounded by function, level, time range, and limit. Treat production logs, request bodies, user identifiers, tokens, connector credentials, secrets, and dashboard URLs as sensitive.

## Prerequisites

Verify authentication before fetching logs, after the user approves local command execution:

```bash
npx base44 whoami
```

If not authenticated or token expired, instruct user to run `npx base44 login`.

Must be run from the project directory (where `base44/.app.jsonc` exists):

```bash
test -f base44/.app.jsonc
```

## Available Commands

| Command | Description | Reference |
|---------|-------------|-----------|
| `base44 logs` | Fetch function logs for this app | [project-logs.md](references/project-logs.md) |

## Troubleshooting Flow

### 1. Check Recent Errors

If live logs are necessary and the failing function is not known yet, start with a bounded recent error query after approval:

```bash
npx base44 logs --level error --since <start_time> --limit 10
```

### 2. Drill Into a Specific Function

If you know which function is failing:

```bash
npx base44 logs --function <function_name> --level error
```

### 3. Inspect a Time Range

Correlate with user-reported issue timestamps:

```bash
npx base44 logs --function <function_name> --since <start_time> --until <end_time> --limit 10
```

### 4. Analyze the Logs

- Look for stack traces and error messages in the output
- Check timestamps to correlate with user-reported issues
- Use `--limit` to fetch more entries if the default 50 isn't enough
