---
name: nightvision-scan-configuration
description: Guide for agents to help users configure NightVision DAST scans. Use when creating targets, setting up authentication (Playwright, headers, cookies), recording HTTP traffic, managing projects, configuring scope exclusions, or preparing private network scans.
---

# NightVision Scan Configuration

Use this skill when helping users set up everything needed before running a NightVision DAST scan - targets, authentication, traffic recordings, projects, and scope control.

## Safety and Authorization

- Only configure or scan systems the user owns or is explicitly authorized to test.
- Ask before running NightVision CLI commands that create, update, delete, upload, record traffic, or start scans.
- Do not print tokens, bearer headers, API keys, cookies, auth recordings, HAR files, or captured traffic in chat.
- Use placeholders in commands for secrets and have the user provide values through environment variables, CI secrets, or the NightVision UI.
- Keep downloaded recordings, HAR files, and scan artifacts out of git unless the user approves a specific gitignored location.

## Agent workflow

When a user asks to configure a scan:

1. Check prerequisites - verify the NightVision CLI is available (`nightvision --help`). Check if `NIGHTVISION_TOKEN` is set.
2. Determine what exists - ask if they have a NightVision account, project, and token already. Use `nightvision project list` and `nightvision target list -p <project>` to see current state (output defaults to text; use `--format json` for structured parsing)
3. Create the project (if needed) - projects organize targets, scans, and auth resources
4. Create the target - web app or API, with the correct URL and spec
5. Set up authentication (if needed) - determine the method and guide the user through it
6. Record traffic (if needed) - for apps with complex workflows or dynamic identifiers
7. Configure scope - set exclusions to avoid scanning health checks, admin endpoints, etc.
8. Verify readiness - confirm the target is reachable and the auth works

Related skills: Use `nightvision-ci-cd-integration` for pipeline setup, `nightvision-api-discovery` for spec extraction, `nightvision-scan-triage` for interpreting results.

## Projects

Projects are organizational containers for targets, scans, and auth resources. They can be shared with team members.

```bash
# Create a project
nightvision project create -n my-project

# List projects
nightvision project list

# Set default project (used when -p flag is omitted)
nightvision project set -p my-project

# Share - done through the web UI at app.nightvision.net
```

## Targets

Two types: Web (URL only) and API (URL + OpenAPI/Postman spec).

### Creating targets

```bash
# Web target
nightvision target create my-web-app https://staging.example.com \
  --type WEB -p my-project

# API target with local spec file (.json, .yml, .yaml, .swagger, .postman)
nightvision target create my-api https://api.example.com \
  --type API -p my-project --spec-file openapi-spec.yml

# API target with remote spec URL
nightvision target create my-api https://api.example.com \
  --type API -p my-project --spec-url https://api.example.com/openapi.json

# Automation-safe create-or-update
if nightvision target get my-api -p my-project >/dev/null 2>&1; then
  nightvision target update my-api -p my-project --spec-file spec.yml
else
  nightvision target create my-api "$URL" --type API -p my-project --spec-file spec.yml
fi
```

Do not use `create || update` for target setup. A create command can fail for reasons other than "already exists"; only update after confirming the target exists.

### Updating targets

```bash
# Update the spec file
nightvision target update my-api -p my-project --spec-file new-spec.yml

# Update the target URL
nightvision target update my-api -p my-project -u https://new-staging.example.com

# List targets in a project
nightvision target list -p my-project
```

### API spec sources

For API targets, the spec can come from:
- Local file (`--spec-file`) - JSON or YAML OpenAPI/Swagger or Postman collection
- Remote URL (`--spec-url`) - publicly accessible spec endpoint
- API Discovery (`nightvision swagger extract`) - extracted from source code (see the `nightvision-api-discovery` skill)
- Postman conversion - convert Postman collections to OpenAPI with `p2o` (npm: `postman-to-openapi`)

## Authentication

NightVision supports three auth methods. The agent should help the user choose the right one.

| Method | Use when | Agent can help? |
|--------|----------|----------------|
| Playwright (interactive login) | Form-based logins, OAuth flows, MFA | No - requires user's browser |
| Headers | API keys, bearer tokens, static auth headers | Yes - agent can construct the command |
| Cookies | Session cookies from a logged-in browser | Partially - user provides cookie values |

### Playwright authentication (user must run locally)

Records a browser-based login flow that NightVision replays during scans. This requires an interactive browser session - instruct the user to run this themselves.

```bash
# Create - opens Chrome, user logs in, closes window to finish
nightvision auth playwright create my-auth https://myapp.example.com

# Update an existing recording
nightvision auth playwright update my-auth https://myapp.example.com
```

NightVision stores the recording securely and replays it before each scan. Screenshots and video are captured to verify login success.

### Header authentication

For APIs using static auth headers (API keys, bearer tokens). The agent can help build this command.

```bash
# Single header
nightvision auth headers create my-auth \
  -H "Authorization: Bearer eyJhbGciOi..."

# Multiple headers
nightvision auth headers create my-auth \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -H "X-API-Key: abc123"

# Update headers on existing auth
nightvision auth headers update my-auth \
  -H "Authorization: Bearer new-token..."
```

### Cookie authentication

```bash
nightvision auth cookies create my-auth \
  --cookie "session_id=abc123; Path=/; HttpOnly"
```

### Managing auth resources

```bash
# List all auth credentials
nightvision auth list -p my-project

# Delete auth credentials
nightvision auth delete my-auth -p my-project
```

### Using auth in scans

```bash
# By name
nightvision scan my-target -p my-project --auth my-auth

# By UUID
nightvision scan my-target -p my-project -C <credentials-uuid>

# Explicitly skip auth
nightvision scan my-target -p my-project --no-auth
```

## HTTP traffic recording

Recording HTTP traffic (HAR files) improves scan coverage for apps with:
- Pages behind complex business logic workflows
- Endpoints requiring valid UUIDs or dynamic identifiers not in the API spec

The HAR file is recorded once and replayed in all subsequent scans on that target.

```bash
# Record traffic - opens Chrome, user interacts with the app, then closes
nightvision traffic record my-recording https://myapp.example.com/workflow \
  --target my-target --output traffic.har

# Upload an existing HAR file
nightvision traffic upload traffic.har --target my-target

# List recorded traffic for a target
nightvision traffic list --target my-target

# Download a recording
nightvision traffic download my-recording --output traffic.har
```

Traffic recording requires a browser - instruct the user to run this locally.

## Scope control

Control which URLs and elements are included or excluded from scans.

```bash
# Exclude URL patterns (regex, comma-separated)
nightvision target update my-target -p my-project \
  --exclude-url "/health,/metrics,/admin.*,/api/internal.*"

# Exclude elements by XPath (for web targets)
nightvision target update my-target -p my-project \
  --exclude-xpath "//button[@id='delete'],//a[@class='logout']"

# Clear all exclusions
nightvision target update my-target -p my-project --exclude-url ""
nightvision target update my-target -p my-project --exclude-xpath ""
```

Common exclusion patterns:
- `/health`, `/healthz`, `/ready` - health check endpoints
- `/metrics`, `/prometheus` - monitoring endpoints
- `/admin.*` - admin panels (if not in scope)
- Logout buttons/links - prevents the scanner from logging itself out

## Private networks (Smart Proxy)

NightVision can scan targets that are not publicly accessible. The Smart Proxy is built into the CLI and activates automatically when the target is unreachable from the internet.

Supported environments: localhost, Docker containers, Kubernetes clusters, staging servers, corporate data centers.

```bash
# Smart Proxy activates automatically for private targets
nightvision scan my-target -p my-project

# Force Smart Proxy even if the target appears public
nightvision scan my-target -p my-project --force-private-scan
```

### Firewall whitelisting

If the target is behind a corporate firewall, whitelist these NightVision AWS NAT Gateway IPs:
- 44.210.184.14
- 3.210.133.44
- 18.210.3.10
- 52.207.103.176
- 52.201.44.112
- 50.17.248.188

## Listing scans

View scan history and status across projects.

```bash
# List scans in the current (or set) project
nightvision scan list

# Filter by one or more projects
nightvision scan list -p my-project
nightvision scan list -p project-a -p project-b

# List scans across all projects
nightvision scan list --all
```

Output includes scan ID, target name, status, start time, duration, and issue count.

## Scan engine options

```bash
# Disable Nuclei (ZAP only)
nightvision scan my-target -p my-project --no-nuclei

# Disable ZAP (Nuclei only)
nightvision scan my-target -p my-project --no-zap

# Disable specific ZAP alert IDs
nightvision scan my-target -p my-project --disable-zap-active-alerts 40012,40014

# Disable specific Nuclei template folders
nightvision scan my-target -p my-project --disable-nuclei-folders cves/2021

# Set max scan duration (default 30 min, max 480 min)
nightvision scan my-target -p my-project --max-duration-minutes 120
```

## Verification checklist

Before running a scan, verify:

1. Token - `NIGHTVISION_TOKEN` is set (or user is logged in)
2. Target - exists and URL is correct (`nightvision target list -p my-project`)
3. Spec (API targets) - uploaded and processing complete (CLI auto-retries if not ready)
4. Auth (if needed) - recorded and associated with the project (`nightvision auth list -p my-project`)
5. Reachability - target is accessible from the machine running the scan (or Smart Proxy will handle it)
