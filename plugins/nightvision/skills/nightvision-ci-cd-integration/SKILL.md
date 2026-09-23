---
name: nightvision-ci-cd-integration
description: Guide for agents to help users integrate NightVision DAST scanning into CI/CD pipelines. Use when setting up security scans in GitHub Actions, GitLab CI, Azure DevOps, Jenkins, BitBucket, or JFrog pipelines, configuring NightVision tokens, creating targets, running scans, exporting results as SARIF/CSV, or detecting API breaking changes.
---

# NightVision CI/CD Integration

Use this skill when helping users add NightVision security scanning to their CI/CD pipelines. NightVision is a white-box-assisted DAST tool that finds exploitable vulnerabilities in web applications and REST APIs. It combines API Discovery (static analysis to extract OpenAPI specs from source code) with dynamic scanning (ZAP + Nuclei engines), and traces vulnerabilities back to exact source code locations (Code Traceback).

## Safety and Authorization

- Only add pipeline scans for systems the user owns or is explicitly authorized to test.
- Ask before editing CI files, adding scheduled scans, creating targets, installing CLI binaries, starting applications, or running scans.
- Put tokens, bearer headers, private keys, and NightVision credentials in the CI platform's secret store. Never hardcode them in workflow files.
- Treat SARIF/CSV output and scan evidence as sensitive. Upload only to the CI destinations the user requested.
- Do not recommend scanning production unless the user explicitly requested it and confirms the scope, rate, auth, and maintenance window.

## Agent workflow

When a user asks to set up NightVision in their pipeline:

1. Check prerequisites - verify the NightVision CLI is available (`nightvision --help`). If not installed, see the Installation section below.
2. Examine the repo - look for existing CI configs (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `bitbucket-pipelines.yml`, `azure-pipelines.yml`) to understand the CI platform and existing pipeline structure
3. Ask the user what you can't determine from the repo:
   - Target URL (staging/production endpoint to scan)
   - Target type - web app or API?
   - Does the app require authentication to scan?
   - What language is the backend? (needed for API Discovery)
   - Have they already created a NightVision project, target, and token?
4. Tell the user what they must do locally - some steps require interactive browser sessions that the agent cannot perform (see Prerequisites below)
5. Generate the pipeline config - adapt the patterns below and the platform-specific examples in [references/ci-platforms.md](references/ci-platforms.md) to the user's repo, substituting their target name, language, app startup method, and CI platform conventions

Related skills: Use `nightvision-scan-configuration` for detailed target/auth setup, `nightvision-api-discovery` for spec extraction details, `nightvision-scan-triage` for interpreting results.

## Pipeline structure

Every NightVision CI pipeline follows this pattern:

```
1. Install the NightVision CLI
2. Extract API spec from source code (API targets only)
3. Start the application (private/local targets only)
4. Run the scan (CLI polls until completion, ~5-15 min)
5. Export results (SARIF / CSV)
6. Upload to CI platform (GitHub Security, GitLab SAST, Azure Boards, Jenkins Warnings)
```

## Prerequisites the user must complete

These steps require interactive sessions (browser login, GUI) that the agent cannot perform. Instruct the user to run these locally before the pipeline will work.

1. Create an API token - requires browser-based login:
```bash
nightvision login
nightvision token create                          # no expiry
nightvision token create --expiry-date 2026-12-31 # with expiry
```
Tokens can also be created in the NightVision web UI: Profile > Settings > Tokens. The user must store the token as a CI secret named `NIGHTVISION_TOKEN`.

2. Record authentication (if the target requires login) - Playwright recording opens a browser:
```bash
nightvision auth playwright create my-auth https://myapp.example.com
# A Chrome window opens - user completes login, then closes the window
```
For API key / bearer token auth, the agent can help construct the command:
```bash
nightvision auth headers create my-auth \
  -H "Authorization: Bearer <token>"
```

3. Create the target - the agent can help with this if `NIGHTVISION_TOKEN` is available:
```bash
# Web target
nightvision target create my-web-app https://staging.example.com --type WEB -p my-project

# API target with local spec
nightvision target create my-api https://api.example.com --type API -p my-project \
  --spec-file openapi-spec.yml

# API target with remote spec URL
nightvision target create my-api https://api.example.com --type API -p my-project \
  --spec-url https://api.example.com/docs/openapi.json

# Automation-safe create-or-update
if nightvision target get my-api -p my-project >/dev/null 2>&1; then
  nightvision target update my-api -p my-project --spec-file spec.yml
else
  nightvision target create my-api "$URL" --type API -p my-project --spec-file spec.yml
fi
```

Do not use `create || update` in pipelines. A create command can fail for network, auth, validation, or project errors; only update after confirming the target already exists.

## Installation (in the pipeline)

```bash
# Linux Intel (standard for most CI runners)
curl -fsSL "$NIGHTVISION_CLI_URL" -o nightvision.tgz
echo "$NIGHTVISION_CLI_SHA256  nightvision.tgz" | sha256sum -c -
tar -xzf nightvision.tgz
sudo mv nightvision /usr/local/bin/
```

Set `NIGHTVISION_CLI_URL` and `NIGHTVISION_CLI_SHA256` to a reviewed NightVision release for the runner architecture. Prefer pinning a CLI version and checksum in production pipelines instead of piping a moving `latest` download directly into `tar`.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NIGHTVISION_TOKEN` | Yes | API token (store as CI secret) |
| `NIGHTVISION_API_URL` | No | API endpoint (default: `https://api.nightvision.net/api/v1/`) |

All config keys accept env vars with the `NIGHTVISION_` prefix (hyphens become underscores).

## CLI output format

Most `list` and `get` commands default to text output. Use `--format json` (or `-F json`) for machine-parseable output, or `--format table` for tabular display.

## API Discovery (spec extraction from source code)

For API targets, extract OpenAPI specs via static analysis. Supports Go, Python, Java, Ruby, C#, JavaScript.

```bash
# Extract and upload to a target
nightvision swagger extract . -t my-api -p my-project --lang python

# Extract locally without uploading
nightvision swagger extract . -o openapi-spec.yml --lang java --no-upload

# Compare specs for breaking changes (useful in PR checks)
nightvision swagger diff old-spec.yml new-spec.yml
```

Important CI pattern - extraction fallback: Extraction can fail if language detection fails. Always use:
```bash
nightvision swagger extract . -o discovered-openapi-spec.yml --lang java --no-upload || true
if [ -e discovered-openapi-spec.yml ]; then
  cp discovered-openapi-spec.yml openapi-spec.yml
else
  cp backup-openapi-spec.yml openapi-spec.yml
fi
nightvision target update "$TARGET" -p "$PROJECT" --spec-file openapi-spec.yml
```

### Code Traceback

When API Discovery generates the spec, it annotates endpoints with file paths and line numbers. Vulnerabilities found during scanning trace back to exact source locations. This powers the file/line links in GitHub Security Alerts, Azure Boards work items, and similar CI integrations.

## Running scans

```bash
# Basic scan
nightvision scan my-target -p my-project

# Authenticated scan
nightvision scan my-target -p my-project --auth my-auth

# Unauthenticated (explicit, skip any stored credentials)
nightvision scan my-target -p my-project --no-auth

# Extended duration (default 30 min, max 480 min / 8 hours)
nightvision scan my-target -p my-project --max-duration-minutes 120

# Engine selection
nightvision scan my-target -p my-project --no-nuclei   # ZAP only
nightvision scan my-target -p my-project --no-zap      # Nuclei only

# Verbose logging (recommended for CI debugging)
nightvision scan my-target -p my-project --verbose
```

### Capturing the scan ID

In CI (non-interactive), the CLI prints the scan ID as the first line of stdout. Use this pattern:

```bash
nightvision scan "$TARGET" -p "$PROJECT" --auth "$AUTH" > scan-results.txt
SCAN_ID=$(head -n 1 scan-results.txt)
```

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Scan completed successfully (`SUCCEEDED`). Vulnerabilities may still have been found. |
| 1 | Scan failed (`FAILED`, `ABORTED`, `TIMED_OUT`), or other error. |

Exit code 0 does not mean "no vulnerabilities." Use export commands to inspect findings.

On failure (exit code 1), the CLI prints a status-specific error message:
- TIMED_OUT - includes the configured `--max-duration-minutes` value and suggests increasing it
- ABORTED - indicates the scan was aborted (by user or system)
- FAILED - includes a link to the dashboard for investigation

When the API provides a failure reason, it is included in the error message and displayed in the TUI dashboard.

### Private / internal targets (Smart Proxy)

NightVision's Smart Proxy automatically tunnels scan traffic through the CLI when the target is not publicly reachable (localhost, Docker, Kubernetes, corporate networks). No configuration needed - it's built into the CLI.

Use `--force-private-scan` to force tunneling when the target appears publicly accessible but isn't from the scanner's perspective.

## Exporting results

```bash
# SARIF with Code Traceback (API targets - provide the spec used for the scan)
nightvision export sarif -s "$SCAN_ID" --swagger-file openapi-spec.yml -o results.sarif

# SARIF without Code Traceback (WEB targets, or when no spec is available)
nightvision export sarif -s "$SCAN_ID" -o results.sarif

# CSV (for reports, spreadsheets, custom processing)
nightvision export csv -s "$SCAN_ID" -o results.csv
```

`--swagger-file` is optional. When provided, SARIF output includes Code Traceback source annotations (file paths and line numbers linking findings to source code). When omitted, the SARIF is still valid but won't contain source locations. Always provide `--swagger-file` for API targets when the spec is available.

## CI platform quick reference

See [references/ci-platforms.md](references/ci-platforms.md) for complete, copy-pasteable pipeline configs.

| Platform | Results surface | Upload mechanism |
|----------|----------------|-----------------|
| GitHub Actions | Security tab (Code Scanning) | `github/codeql-action/upload-sarif@v3` (needs `permissions: contents: read, security-events: write`) |
| GitLab CI | Vulnerability dashboard | Convert SARIF to GitLab security report JSON, `artifacts.reports.sast` |
| Azure DevOps | Azure Boards work items | `sarif-manager azure create-work-items` |
| Jenkins | Warnings Next Generation | `recordIssues tool: sarif(pattern: 'results.sarif')` |
| BitBucket | Pipeline artifacts | SARIF as artifact |
| JFrog | Evidence on Docker packages | `jf evd create` with SARIF predicate |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "login authentication token has expired" | Token expired or invalid | `nightvision token create`, update CI secret |
| "API is unreachable" | Network/firewall issue | Check `NIGHTVISION_API_URL`, network connectivity |
| "SSL certificate error" | TLS verification failed | Fix certs, or `--skip-tls-verify` (not for production) |
| Scan `TIMED_OUT` | Exceeded max duration | CLI error message shows the current limit; increase `--max-duration-minutes` (up to 480) |
| Scan `ABORTED` | Scan was cancelled by user or system | Check the failure reason in the CLI output or dashboard |
| Scan `FAILED` | Engine error or target unreachable | CLI error includes a dashboard link; also use `--verbose` and verify target is up |
| 401 Unauthorized during scan | Auth credentials expired | Re-record authentication locally |
| "Repository not found" in checkout | `permissions` block missing `contents: read` | Add `contents: read` alongside `security-events: write` in the workflow permissions |
