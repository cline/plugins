# Retry and Error Codes Reference

Comprehensive guide to Buildkite exit codes, retry strategies, and failure handling.

## Exit Code Table

| Exit code | Meaning | Retryable | Recommendation |
|-----------|---------|-----------|----------------|
| `0` | Success | - | No action needed |
| `1` | General error (test failure, script error) | Usually no | Fix the code; don't auto-retry genuine failures |
| `-1` | Agent lost connection | Yes | Agent crashed, network drop, or OOM kill. Always retry. |
| `2` | Misuse of shell command | No | Fix the script syntax |
| `125` | Docker daemon error | Sometimes | Docker pull failed or daemon unavailable. Retry once. |
| `126` | Command not executable | No | Fix file permissions: `chmod +x script.sh` |
| `127` | Command not found | No | Install missing binary or fix PATH |
| `128` | Invalid exit argument | No | Script called `exit` with invalid value |
| `137` | SIGKILL (OOM) | Sometimes | Container hit memory limit. Increase memory or optimize. |
| `143` | SIGTERM | Yes | Spot instance termination, agent shutdown. Always retry. |
| `255` | SSH failure or timeout | Yes | Network timeout, SSH connection lost. Retry with limit. |

## Retry Strategy Recommendations

### Infrastructure failures (always retry)

```yaml
retry:
  automatic:
    - exit_status: -1    # Agent lost
      limit: 2
    - exit_status: 143   # Spot termination
      limit: 2
    - exit_status: 255   # SSH/timeout
      limit: 2
```

### Network-sensitive steps (retry with backoff)

For steps that fetch external dependencies (npm install, docker pull, apt-get):

```yaml
retry:
  automatic:
    - exit_status: -1
      limit: 2
    - exit_status: 125   # Docker daemon
      limit: 1
    - exit_status: "*"   # Catch network errors (ECONNRESET, ETIMEDOUT)
      limit: 1
```

### Deploy steps (no auto-retry)

Deployment steps should not auto-retry to prevent double-deploys:

```yaml
retry:
  automatic: false
  manual:
    allowed: true
    reason: "Review logs before retrying a deployment"
```

### Test steps (targeted retry)

Retry only infrastructure failures, not test failures:

```yaml
retry:
  automatic:
    - exit_status: -1
      limit: 2
    - exit_status: 143
      limit: 2
  manual:
    allowed: true
```

Do not use `exit_status: "*"` for test steps - it masks real test failures and wastes compute.

## soft_fail vs retry

| Mechanism | Purpose | Build status |
|-----------|---------|-------------|
| `retry.automatic` | Re-run the step hoping for a different result | Passes if retry succeeds |
| `retry.manual` | Allow humans to re-run from the UI | Stays failed until retried |
| `soft_fail` | Acknowledge failure without blocking the build | Build passes regardless |
| `soft_fail` with `exit_status` | Treat specific codes as soft failure | Only matched codes are soft |

### soft_fail examples

```yaml
# Treat any failure as soft (non-blocking)
- label: "Lint"
  command: "make lint"
  soft_fail: true

# Only treat exit code 1 as soft (other codes still hard-fail)
- label: "Optional integration test"
  command: "make test-integration"
  soft_fail:
    - exit_status: 1
```

## Retry Limits

| `limit` value | Meaning |
|---------------|---------|
| `1` | Retry once (2 total attempts) |
| `2` | Retry twice (3 total attempts) |
| `10` | Maximum allowed value |

Keep limits low. High retry counts on genuine failures waste agent time and delay feedback. Recommended: `limit: 2` for infrastructure, `limit: 1` for everything else.

## Combining Retry Rules

Multiple automatic retry rules are evaluated in order. The first matching rule applies:

```yaml
retry:
  automatic:
    - exit_status: -1     # Agent lost → retry 2x
      limit: 2
    - exit_status: 143    # Spot termination → retry 2x
      limit: 2
    - exit_status: 255    # SSH/timeout → retry 1x
      limit: 1
    - exit_status: "*"    # Anything else → retry 1x
      limit: 1
```

Place specific codes before the wildcard `"*"`. The wildcard catches all non-zero exits not matched by earlier rules.
