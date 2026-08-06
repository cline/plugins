---
name: fastly-ngwaf
description: "Performs an internal audit of Fastly Next-Gen WAF (NGWAF) workspaces to audit that critical templated protection rules are configured and enabled. Use when auditing NGWAF workspace security posture, checking for missing or disabled login protection rules (LOGINDISCOVERY, LOGINATTEMPT, LOGINSUCCESS, LOGINFAILURE), auditing credit card validation rules (CC-VAL-ATTEMPT, CC-VAL-FAILURE, CC-VAL-SUCCESS), auditing gift card protection rules (GC-VAL-ATTEMPT, GC-VAL-FAILURE, GC-VAL-SUCCESS), or identifying potential login endpoints not covered by NGWAF rules."
---

# Fastly NGWAF Workspace Audit

Audits NGWAF workspaces to verify critical templated rules are configured and enabled. Use the fastly-cli skill to configure rules; this skill identifies gaps.

This skill is read-oriented by default. Request-log paths can contain sensitive business or user data, so summarize findings narrowly and avoid printing raw payloads or credentials. Before making any NGWAF rule, signal, IP list, country list, threshold, or workspace changes, state the target workspace and ask for explicit confirmation.

## Quick Start

Run the bundled assessment script from the installed skill directory (requires `jq` and `FASTLY_API_TOKEN`). Do not assume the user's project root has a `scripts/` directory:

```bash
<installed-fastly-ngwaf-skill-dir>/scripts/assess_ngwaf_rules.sh
```

For manual inspection or partial audits, use the API calls below.

## Audit Workflow

1. List workspaces -- verify the account has NGWAF workspaces
2. Fetch rules per workspace -- retrieve each workspace's rule set
3. Validate critical signals -- confirm required rules exist and are enabled
4. Flag gaps and search for uncovered endpoints -- report missing/disabled rules

### Step 1: List Workspaces

```bash
curl -s -H "Fastly-Key: $FASTLY_API_TOKEN" \
  "https://api.fastly.com/ngwaf/v1/workspaces?limit=200" | jq '.data[].id'
```

If empty, NGWAF is not configured for this account.

### Step 2: Fetch Rules for a Workspace

```bash
curl -s -H "Fastly-Key: $FASTLY_API_TOKEN" \
  "https://api.fastly.com/ngwaf/v1/workspaces/$WORKSPACE_ID/rules?limit=200"
```

### Step 3: Validate Critical Signals

For each workspace, verify these templated rules exist and `enabled` is `true`:

| Category               | Required Signals                                                 |
| ---------------------- | ---------------------------------------------------------------- |
| Login Protection       | `LOGINDISCOVERY`, `LOGINATTEMPT`, `LOGINSUCCESS`, `LOGINFAILURE` |
| Credit Card Validation | `CC-VAL-ATTEMPT`, `CC-VAL-FAILURE`, `CC-VAL-SUCCESS`             |
| Gift Card Validation   | `GC-VAL-ATTEMPT`, `GC-VAL-FAILURE`, `GC-VAL-SUCCESS`             |

Check a specific signal:

```bash
curl -s -H "Fastly-Key: $FASTLY_API_TOKEN" \
  "https://api.fastly.com/ngwaf/v1/workspaces/$WORKSPACE_ID/rules?limit=200" \
  | jq '[.data[] | select(.actions[].signal == "LOGINDISCOVERY") | {enabled, id}]'
```

### Step 4: Search for Uncovered Login Endpoints

When `LOGINATTEMPT` is missing or disabled, search recent request logs for login-like traffic the WAF isn't protecting:

```bash
curl -s -H "Fastly-Key: $FASTLY_API_TOKEN" \
  "https://api.fastly.com/ngwaf/v1/workspaces/$WORKSPACE_ID/requests?limit=100&page=1&q=from%3A-30min%20method%3APOST%20path%3A~%22%2Alogin%2A%22" \
  | jq -r '.data[].path' | sort | uniq -c
```

## Expected Output

Healthy workspace -- all signals present and enabled:

```text
### Workspace: abc123
  [LOGIN Rules]
  - LOGINDISCOVERY: ENABLED
  - LOGINATTEMPT: ENABLED
  - LOGINSUCCESS: ENABLED
  - LOGINFAILURE: ENABLED
  [CC Rules]
  - CC-VAL-ATTEMPT: ENABLED
  - CC-VAL-FAILURE: ENABLED
  - CC-VAL-SUCCESS: ENABLED
  [GC Rules]
  - GC-VAL-ATTEMPT: ENABLED
  - GC-VAL-FAILURE: ENABLED
  - GC-VAL-SUCCESS: ENABLED
```

Unhealthy workspace -- missing or disabled rules require remediation:

```text
### Workspace: def456
  [LOGIN Rules]
  - LOGINDISCOVERY: NOT CONFIGURED (Recommended: CRITICAL: Configure and enable this rule to discover unknown login endpoints)
  - LOGINATTEMPT: IS DISABLED (Recommended: Enable this rule)
  - LOGINSUCCESS: ENABLED
  - LOGINFAILURE: ENABLED
  -> LOGINATTEMPT is not enabled. Searching recent request logs for potential login paths...
  -> Found potential login paths in last 30 minutes:
       3 /api/v1/login
       1 /auth/signin
```

## Error Handling

| Error                             | Cause                        | Fix                                            |
| --------------------------------- | ---------------------------- | ---------------------------------------------- |
| `FASTLY_API_TOKEN not set`          | Environment variable missing | Ask the user to provide it through their shell, CI secret manager, or Fastly CLI login flow; do not paste tokens into chat |
| `API call failed with status 403` | Token lacks NGWAF scope      | Verify token has `global:read` permission      |
| `No workspaces found`             | NGWAF not provisioned        | Enable NGWAF on the account first              |
| `jq is not installed`             | Missing dependency           | `brew install jq` or `apt-get install -y jq`   |

## API References

- [List Workspaces](https://www.fastly.com/documentation/reference/api/ngwaf/workspaces/#ngwafListWorkspaces)
- [List Workspace Rules](https://www.fastly.com/documentation/reference/api/ngwaf/rules/#ngwafListWorkspaceRules)
