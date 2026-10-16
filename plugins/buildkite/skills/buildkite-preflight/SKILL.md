---
name: buildkite-preflight
description: "Runs Buildkite CI builds against changes in the local working tree. Use when asked to run preflight or run CI."
---

# Buildkite Preflight

Preflight runs CI builds against changes in the local working directory. It's intended to provide a feedback loop for evaluating local changes in CI by providing a single command to run the entire commit/push/run loop.

## When to Run Preflight

- Run preflight only when the user asks for it or explicitly approves a CI run
- Use it after local checks pass and the user wants remote Buildkite confirmation
- Use it after fixing a failure from a previous preflight run, with approval for the rerun
- Do not use it for trivial changes like typos, comment-only edits, or single-line config tweaks unless the user asks

## Before Running

- Prefer an explicit pipeline in `{org}/{pipeline}` form
- Ensure `bk auth` is pointed at the right Buildkite organization when the pipeline slug relies on local config
- Requires a git repository with at least one commit and push access to `origin`
- Requires `read_builds`, `write_builds`, and `read_pipelines` scopes; and `read_suites` for Test Engine results.
- Explain that preflight can push a temporary branch, create a Buildkite build, consume CI capacity, and cancel or clean up remote resources depending on flags

## Running Preflight

```bash
# Human-readable output that works well in agent shells
bk preflight --pipeline my-org/my-pipeline --watch --text

# Start a run and return as soon as the build enters the failing state
bk preflight --pipeline my-org/my-pipeline --watch

# Wait for a terminal build state instead of fast-failing
bk preflight --pipeline my-org/my-pipeline --watch --exit-on=build-terminal

# Start the build and exit immediately
bk preflight --pipeline my-org/my-pipeline --no-watch

# Leave the remote preflight branch and build running on early exit
bk preflight --pipeline my-org/my-pipeline --watch --no-cleanup

# Wait for 30s after build completion for Test Engine summaries
bk preflight --pipeline my-org/my-pipeline --watch --await-test-results 30s
```

Do not set a timeout on a watched preflight run.

## How It Works

Preflight executes the following workflow:

1. Snapshot - Captures staged, unstaged, and untracked files using a temporary git index, without modifying the real index or working tree.
2. Commit - Creates a distinct preflight commit on top of `HEAD`, even when the tree is clean, so the run has its own commit status context.
3. Push - Pushes that commit to `refs/heads/bk/preflight/<uuid>` on `origin`.
4. Create Build - Calls the Buildkite Create Build API and sets `PREFLIGHT=true`, `PREFLIGHT_SOURCE_COMMIT`, and `PREFLIGHT_SOURCE_BRANCH` when available.
5. Monitor - Watches the build and emits operation events, build status updates, job failures, retry-passed jobs, and a final summary.
6. Cleanup - Deletes the remote preflight branch when the run finishes unless `--no-cleanup` is set. With the default `--exit-on=build-failing`, early exit also cancels the remote build unless `--no-cleanup` is set.

The working tree is never disrupted, so you can keep editing while the build runs.

## Reading the Result

- The default exit policy is `build-failing`, so the preflight command exits as soon as the build enters the `failing` state.
- `--exit-on=build-terminal` waits for a terminal build state (passed, failed, canceled).
- `--await-test-results` waits after build completion for Test Engine rollups when test runs exist.
- Final job summaries cover hard-failed script jobs and exclude non-script, broken, and soft-failed jobs
- Failed job output includes the job id. Use `bk job log -b <build-number> -p <org>/<pipeline> <job-id>` to inspect logs.
- When analytics are available, the final summary shows per-suite passed/failed/skipped counts and up to 10 failed tests.
- Test failures include the test name and location; reproduce the failure locally and fix it.
- If a failure is flaky/unrelated to your changes, note it to the user rather than trying to fix it.

Extracting results from the JSON build_summary event:

```
Just the failed jobs from the summary:

bk preflight --pipeline my-org/my-pipeline --watch --json \
  | jq -nrc --unbuffered 'inputs | select(.type == "build_summary") | .failed_jobs'

Just the failed tests from the summary:

bk preflight --pipeline my-org/my-pipeline --watch --json \
  | jq -nrc --unbuffered 'inputs | select(.type == "build_summary") | .tests.failures'
```

## Output Modes

- Use `--text` for plain text logs that are easy to read in tool output
- Use `--json` when you need structured event data
- If neither flag is set, `bk` uses the interactive TTY UI when stdout is a terminal and plain text otherwise

## Running a Preflight Build

### Basic usage

```bash
# Run preflight and watch until completion
bk preflight --pipeline my-org/my-pipeline --watch

# Run without watching (starts the build and exits)
bk preflight --pipeline my-org/my-pipeline --no-watch

# Skip confirmation prompts only after explicit user approval
bk preflight --pipeline my-org/my-pipeline --watch --yes

# Keep the remote preflight branch after the build finishes
bk preflight --pipeline my-org/my-pipeline --watch --no-cleanup

# Use plain text output in non-interactive environments
bk preflight --pipeline my-org/my-pipeline --watch --text

# Use JSONL output when another tool needs structured events
bk preflight --pipeline my-org/my-pipeline --watch --json

# Wait for 10s for Test Engine results after build completion
bk preflight --pipeline my-org/my-pipeline --watch --await-test-results 10s
```

Do not set a timeout on the bash tool running preflight.

### Pipeline resolution

The `--pipeline` flag accepts either a pipeline slug or `{org slug}/{pipeline slug}`:

```bash
# With org prefix (explicit)
bk preflight --pipeline my-org/my-pipeline --watch

# Pipeline slug only (org resolved from bk config)
bk preflight --pipeline my-pipeline --watch
```

## Flags

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--pipeline` | `-p` | - | Pipeline to build (`{slug}` or `{org}/{slug}`) (required) |
| `--[no-]watch` | | - | Watch the build until completion |
| `--exit-on` | | `build-failing` | Exit on `build-failing` or `build-terminal` |
| `--interval` | | `2` | Polling interval in seconds when watching |
| `--no-cleanup` | | `false` | Skip deleting the remote preflight branch after the build finishes |
| `--await-test-results` | | | Wait for Test Engine summaries after build completion |
| `--text` | | `false` | Use plain text output instead of the interactive UI |
| `--json` | | `false` | Emit one JSON object per event (JSONL) |
| `--yes` | `-y` | `false` | Skip all confirmation prompts |
| `--no-input` | | `false` | Disable all interactive prompts |
| `--quiet` | `-q` | `false` | Suppress progress output |
| `--no-pager` | | `false` | Disable pager for text output |
| `--debug` | | `false` | Enable debug output for REST API calls |

## Exit Codes

Check the exit code to determine the build result:

| Exit Code | Meaning | Action |
|-----------|---------|--------|
| `0` | All command jobs passed | Proceed with commit/push |
| `1` | Generic error | Check error message for details |
| `9` | Build completed with failures | Examine failed jobs and fix |
| `10` | Build incomplete but failures observed | Build still running; failures already detected |
| `11` | Build incomplete (scheduled/running/blocked) | Build hasn't finished yet |
| `12` | Unknown build state | Investigate the build on Buildkite |
| `130` | User aborted (Ctrl+C) | Re-run when ready |

## Further Reading

- [Buildkite CLI overview](https://buildkite.com/docs/platform/cli)
- [CLI command reference](https://buildkite.com/docs/platform/cli/reference)
- [CLI installation](https://buildkite.com/docs/platform/cli/installation)

## Optional Workflow: Act On A Failure And Check Back Later

Begin fixing the first failure as soon as preflight exits with an incomplete build result because the build is failing, and then check back on the same build with `bk build view` for subsequent failures. This allows you to quickly iterate on the first failure, and gather further failures in parallel. Use the `bk preflight --no-cleanup` option to ensure that build is not cancled on fast failure.

```bash
bk preflight --pipeline my-org/my-pipeline --watch --no-cleanup --text
```

`bk preflight` will return as soon as the build transitions to `failing`, using the default `--exit-on=build-failing` behavior. Setting the `--no-cleanup` flag is required if you want the build to continue running to completion.

Workflow:

1. Wait for preflight to exit on build failing (the default --exit-on condition).
2. Inspect the failed build's jobs logs and test failures and start fixing the issue immediately.
3. Keep the build number or preflight UUID from the run output.
4. Use `bk build view` to check the same build again while it continues running:

```bash
bk build view <build-number> -p my-org/my-pipeline --text
```

5. After the build reaches a terminal state and you no longer need the remote preflight branch, clean it up explicitly:

```bash
bk preflight cleanup --pipeline my-org/my-pipeline --preflight-uuid <uuid> --yes --text
```

`bk preflight cleanup` only deletes completed preflight branches, so run it after the build has finished.

Use `--yes` or `--no-input` only when the user already approved the exact preflight or cleanup action. Those flags skip safety prompts around remote branch and build operations.
