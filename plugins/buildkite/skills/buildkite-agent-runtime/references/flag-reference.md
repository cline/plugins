# Buildkite Agent Runtime - Complete Flag Reference

Exhaustive flag tables for every `buildkite-agent` subcommand used inside job steps. The SKILL.md contains the most common flags inline; this file has the full set.

## annotate

```
buildkite-agent annotate [body] [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--style` | `-s` | `default` | Annotation style: `default`, `info`, `warning`, `error`, `success` |
| `--context` | `-c` | random UUID | Unique context key - reusing replaces the annotation |
| `--append` | - | `false` | Append content to existing annotation with same context |
| `--priority` | - | `3` | Display priority (1-10), higher numbers shown first |
| `--job` | - | current job | Job UUID to annotate |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--no-color` | - | `false` | Disable colored output |
| `--debug` | - | `false` | Enable debug logging |

Body can be passed as a positional argument, piped from stdin, or read from a file via redirection.

## artifact upload

```
buildkite-agent artifact upload <pattern> [destination] [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--job` | - | `$BUILDKITE_JOB_ID` | Job UUID to associate artifacts with |
| `--content-type` | - | auto-detected | MIME type for uploaded files |
| `--glob` | - | - | Glob pattern (alternative to positional argument) |
| `--follow-symlinks` | - | `false` | Follow symbolic links when resolving globs |
| `--upload-skip-symlinks` | - | `false` | Skip symbolic links entirely |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

Multiple glob patterns can be separated by `;` in the positional argument: `"logs/*.log;dist/*"`.

## artifact download

```
buildkite-agent artifact download <query> <destination> [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--step` | - | all steps | Step key or UUID to scope downloads to |
| `--build` | - | current build | Build UUID to download from |
| `--include-retried-jobs` | - | `false` | Include artifacts from retried job attempts |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

Quote wildcard queries to prevent shell expansion: `"pkg/*.tar.gz"` not `pkg/*.tar.gz`.

## artifact search

```
buildkite-agent artifact search <query> [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--step` | - | all steps | Step key or UUID to scope search to |
| `--build` | - | current build | Build UUID to search within |
| `--format` | - | default | Output format template (e.g., `%p\n` for path per line) |
| `--include-retried-jobs` | - | `false` | Include artifacts from retried job attempts |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

## artifact shasum

```
buildkite-agent artifact shasum <query> [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--sha256` | - | `false` | Return SHA-256 hash instead of SHA-1 |
| `--step` | - | all steps | Step key or UUID to scope to |
| `--build` | - | current build | Build UUID |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

SHA-256 is only available for artifacts uploaded after SHA-256 support was added. Older artifacts only have SHA-1.

## meta-data set

```
buildkite-agent meta-data set <key> [value] [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--job` | - | current job | Job UUID for context |
| `--build` | - | current build | Build UUID |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

Value can be passed as second positional argument, piped from stdin, or redirected from a file. Value must be a non-empty string.

## meta-data get

```
buildkite-agent meta-data get <key> [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--default` | - | - | Default value if key does not exist (prevents non-zero exit) |
| `--job` | - | current job | Job UUID for context |
| `--build` | - | current build | Build UUID |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

Without `--default`, exits with a non-zero code if the key does not exist.

## meta-data exists

```
buildkite-agent meta-data exists <key> [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--job` | - | current job | Job UUID for context |
| `--build` | - | current build | Build UUID |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

Returns exit code `0` if key exists, `100` if not.

## meta-data keys

```
buildkite-agent meta-data keys [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--build` | - | current build | Build UUID |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

Outputs one key per line.

## pipeline upload

```
buildkite-agent pipeline upload [file] [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--replace` | - | `false` | Replace remaining pipeline steps instead of appending |
| `--no-interpolation` | - | `false` | Skip `$VARIABLE` interpolation in the uploaded YAML |
| `--dry-run` | - | `false` | Output the parsed pipeline without uploading |
| `--reject-secrets` | - | `false` | Reject upload if plain-text secrets are detected |
| `--job` | - | current job | Job UUID |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

If no file is specified, looks for `.buildkite/pipeline.yml`, `.buildkite/pipeline.json`, `buildkite.yml`, or `buildkite.json`. Pipeline is limited to 500 steps per upload.

## oidc request-token

```
buildkite-agent oidc request-token [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--audience` | - | Buildkite endpoint | Target service URL for the token's `aud` claim |
| `--lifetime` | - | `600` | Token lifetime in seconds |
| `--claim` | - | - | Comma-separated optional claims to include (e.g., `organization_id,pipeline_id`) |
| `--aws-session-tag` | - | - | Comma-separated claims to map as AWS session tags |
| `--job` | - | current job | Job UUID |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

Token is printed to stdout. Pipe or capture with `$()`.

## step get

```
buildkite-agent step get <attribute> [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--step` | - | current step | Step key or UUID |
| `--build` | - | current build | Build UUID |
| `--format` | - | `string` | Output format |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

## step update

```
buildkite-agent step update <attribute> <value> [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--step` | - | current step | Step key or UUID |
| `--build` | - | current build | Build UUID |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

## step cancel

```
buildkite-agent step cancel [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--step` | - | current step | Step key or UUID to cancel |
| `--build` | - | current build | Build UUID |
| `--force` | - | `false` | Force cancel even if the step is running |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

## lock acquire

```
buildkite-agent lock acquire <name> [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--timeout` | - | `0` (wait forever) | Maximum wait time in seconds |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

Returns a lock token (string) that must be passed to `lock release`.

## lock release

```
buildkite-agent lock release <name> <token> [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

## lock do

```
buildkite-agent lock do <name> [options...]
```

Returns `do` if the lock was acquired (caller should do the work, then call `lock done`). Returns `done` if another process already completed the work.

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

## lock done

```
buildkite-agent lock done <name> [options...]
```

Marks a `do`-style lock as completed. Other callers of `lock do` will now receive `done`.

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

## lock get

```
buildkite-agent lock get <name> [options...]
```

Returns the current state of a `do`-style lock: `do` (not yet completed) or `done` (completed).

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

## env dump

```
buildkite-agent env dump [options...]
```

Outputs all environment variables as JSON to stdout.

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--format` | - | `json` | Output format |
| `--agent-access-token` | - | from env | Agent registration token |
| `--debug` | - | `false` | Enable debug logging |

## env get

```
buildkite-agent env get <keys...> [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--format` | - | `json` | Output format |
| `--agent-access-token` | - | from env | Agent registration token |
| `--debug` | - | `false` | Enable debug logging |

Accepts one or more variable names as positional arguments.

## env set

```
buildkite-agent env set <key> <value> [options...]
```

Sets an environment variable for subsequent hook phases and the command phase. Does not affect the current running script.

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--agent-access-token` | - | from env | Agent registration token |
| `--debug` | - | `false` | Enable debug logging |

## env unset

```
buildkite-agent env unset <key> [options...]
```

Removes an environment variable from subsequent hook phases.

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--agent-access-token` | - | from env | Agent registration token |
| `--debug` | - | `false` | Enable debug logging |

## secret get

```
buildkite-agent secret get <key...> [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--format` | - | `string` | Output format: `string` (single secret), `env` (KEY="value" pairs) |
| `--skip-redaction` | - | `false` | Do not register the value with the log redactor |
| `--job` | - | current job | Job UUID |
| `--agent-access-token` | - | from env | Agent registration token |
| `--endpoint` | - | from config | Agent API endpoint |
| `--debug` | - | `false` | Enable debug logging |

Accepts one or more secret names. With `--format env`, outputs `KEY="value"` pairs suitable for `eval` or `source`.

## redactor add

```
buildkite-agent redactor add [options...]
```

Reads the value to redact from stdin. All subsequent log output containing this value will show `[REDACTED]`.

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--agent-access-token` | - | from env | Agent registration token |
| `--debug` | - | `false` | Enable debug logging |

## tool sign

```
buildkite-agent tool sign [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--jwks-file` | - | - | Path to JWKS key file for signing |
| `--jwks-key-id` | - | - | Key ID to use from the JWKS file |
| `--step` | - | - | Step attribute to sign (repeatable, format: `key=value`) |
| `--debug` | - | `false` | Enable debug logging |

## tool verify

```
buildkite-agent tool verify [options...]
```

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--jwks-file` | - | - | Path to JWKS key file for verification |
| `--jwks-key-id` | - | - | Key ID to use from the JWKS file |
| `--step` | - | - | Step attribute to verify (repeatable, format: `key=value`) |
| `--debug` | - | `false` | Enable debug logging |
