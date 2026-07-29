---
name: clickhouse
description: Connect to and query ClickHouse (a local server or a ClickHouse Cloud service) from the terminal. For ClickHouse Cloud analytics, use the configured direct ClickHouse Query API endpoint with per-user CH_API_KEY and CH_API_SECRET credentials; do not use clickhousectl cloud service query. For local or host/port servers, use clickhousectl local client. Use when the user wants to run SQL against ClickHouse, explore schemas and tables, inspect Cloud services, or authenticate. For building a local dev environment or deploying to Cloud, defer to the official ClickHouse skills (see Scope).
---

# ClickHouse Connection and Queries

Pick the right access path for the target:

| Target | Path |
| ------ | ---- |
| ClickHouse Cloud analytics | Configured direct ClickHouse Query API endpoint with per-user `CH_API_KEY` / `CH_API_SECRET` |
| Local server or any host/port | `clickhousectl local client` |

Do not use `clickhousectl cloud service query` for Cloud analytics. It depends on locally stored service-query-key state and may auto-provision keys, which causes key sprawl and inconsistent behavior across machines.

This skill does not use the ClickHouse MCP server.

## Scope

This skill is for connecting and querying. For these other flows, use the bundled official ClickHouse skills (siblings in this directory) instead of reinventing them:

- Setting up a local dev environment from scratch (install ClickHouse, init a project, start a server, create schema): `../clickhousectl-local-dev/`.
- Deploying to or migrating into ClickHouse Cloud (create a service, migrate schema, provision an app user): `../clickhousectl-cloud-deploy/`.
- Writing or optimizing non-trivial SQL, or the agent schema-discovery and query-safety workflow: `../clickhouse-best-practices/`.
- Running SQL on local files or remote sources without a server: `../chdb-sql/`.

These are vendored from https://github.com/ClickHouse/agent-skills (Apache-2.0). They can also be installed standalone with `clickhousectl skills` or `npx skills add clickhouse/agent-skills`.

---

## Path A: ClickHouse Cloud - direct Query API with per-user key

Use the configured direct ClickHouse Query API endpoint with the user's per-user ClickHouse Cloud API key. This is the required Cloud path for the Data Analyst skill. It avoids `clickhousectl cloud service query`, local service-query-key state, automatic key provisioning, and key sprawl.

The Query API endpoint is team-managed and should be authorized for each `data-agent-<username>` API key with a read-only database role. Users should only need to store their own key ID and secret locally.

### Credentials

Read from the local environment:

```bash
CH_API_KEY    # required - per-user ClickHouse Cloud API key ID
CH_API_SECRET # required - per-user ClickHouse Cloud API key secret
```

If `CH_API_KEY` or `CH_API_SECRET` is missing, stop and tell the user:

```text
Missing ClickHouse Query API credentials.
Set CH_API_KEY and CH_API_SECRET in your local environment.
Use your per-user data-agent-<username> ClickHouse Cloud API key.
Do not paste secrets into chat and do not use a shared org-wide key.
```

Never print `CH_API_SECRET`.

### Endpoint

Use the configured Prod Query API endpoint for this skill. Do not ask each user to create their own endpoint or use `clickhousectl cloud service query`.

```bash
CH_QUERY_ENDPOINT="https://queries.clickhouse.cloud/service/b14c43d1-44f9-4446-ae00-483bcbc6952a/run"
```

Keep endpoint configuration separate from user credentials. `CH_API_KEY` / `CH_API_SECRET` identify who is calling; the endpoint's database role controls what SQL can run.

### Running queries

```bash
curl -X POST -s \
  --user "$CH_API_KEY:$CH_API_SECRET" \
  "$CH_QUERY_ENDPOINT?format=JSONEachRow" \
  -H 'Content-Type: application/json' \
  -d '{ "sql": "SELECT 1 AS ok" }'
```

Connectivity check:

```bash
curl -X POST -s \
  --user "$CH_API_KEY:$CH_API_SECRET" \
  "$CH_QUERY_ENDPOINT?format=JSONEachRow" \
  -H 'Content-Type: application/json' \
  -d '{ "sql": "SELECT 1 AS ok" }'
# Expected: {"ok":1}
```

Schema access check:

```bash
curl -X POST -s \
  --user "$CH_API_KEY:$CH_API_SECRET" \
  "$CH_QUERY_ENDPOINT?format=JSONEachRow" \
  -H 'Content-Type: application/json' \
  -d '{ "sql": "SHOW DATABASES" }'
```

Output format: `JSONEachRow` - parse line-by-line; each non-empty line is a JSON object.

### Read-only guardrails (defense-in-depth)

Before sending any query, check that the first SQL token is not one of:

```text
INSERT, ALTER, DROP, TRUNCATE, CREATE, DELETE, SYSTEM, OPTIMIZE, RENAME, GRANT, REVOKE
```

If it is, refuse. The real enforcement layer is the read-only database role configured on the Query API endpoint - client-side checks are defense-in-depth only.

### Error handling

| HTTP status | Likely cause | Action |
| ----------- | ------------ | ------ |
| `200` with `{"ok":1}` | Success | Proceed |
| 401 | Wrong key ID or secret; extra whitespace; key disabled | Re-check local credentials |
| 403 | Key is not authorized on the endpoint; IP allowlist; database role denial | Confirm the user's key is authorized on the Prod Query API endpoint |
| 4xx/5xx | Query error or service issue | Surface full error body to user, with secrets redacted |

Surface the full HTTP status and response body on errors, but redact secrets. Do not retry silently.

### Credential policy

- Use one per-user API key named `data-agent-<username>`.
- Authorize that key on the Prod Query API endpoint.
- Keep the endpoint database role read-only.
- Do not use shared org-wide keys.
- Do not rely on automatic `clickhousectl cloud service query` provisioning.
- Rotate or revoke the user's key for offboarding.

---

## Path B: Local or host/port server - clickhousectl CLI

### Step 1: Ensure clickhousectl is installed

```bash
which clickhousectl
```

If not found, install it (downloads the right build for the OS, installs to `~/.local/bin/clickhousectl`, and creates a `chctl` alias):

```bash
curl -fsSL https://clickhouse.com/cli | sh
```

If the command is still not found after install, `~/.local/bin` is not on PATH for this session:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### Step 2: Identify the target

Decide what you are querying before connecting.

List local servers and their ports:

```bash
clickhousectl local server list
```

### Step 3: Run queries

Local named server (uses `clickhouse-client`):

```bash
clickhousectl local client --name <server> -q "SHOW TABLES"
clickhousectl local client --name <server> -q "SELECT count() FROM events" --format JSONEachRow
clickhousectl local client --name <server> --queries-file query.sql
```

Any reachable host/port:

```bash
clickhousectl local client --host myhost --port 9000 -q "SELECT 1"
```

Prefer `--format` (e.g. `JSONEachRow`, `CSV`, `TabSeparated`) when you need to parse results in a later step. SQL precedence: `--query` > `--queries-file` > stdin.

---

## Safe query practices

Keep queries safe, explainable, and bounded - regardless of which path you use.

1. Discover schema/table shape if unknown: `SHOW DATABASES`, `SHOW TABLES`, `DESCRIBE TABLE <t>`.
2. Draft SQL using documented definitions when available (see `../reading-data-dict/`).
3. Explain what the SQL does before expensive execution.
4. Preview first when returning rows: `LIMIT 10` or `LIMIT 100`.
5. Prefer aggregate queries for metrics; avoid dumping high-cardinality raw data.
6. Confirm with the user before long-running, broad, or expensive scans.
7. Return the SQL with results so the user can inspect and reuse it.

Safety checks:

- Avoid accidental cross joins; use explicit join keys and know why the join is valid.
- Filter by time window whenever possible.
- Avoid `SELECT *` except tiny schema previews.
- Check row counts before exporting large result sets.
- Add `?format=JSONEachRow` for Cloud Query API calls, or `--format JSONEachRow` for `clickhousectl local client`, when you need machine-readable output downstream.

## Bounded queries and large tables

Large fact tables can time out or exceed memory even for seemingly simple sanity checks. Keep exploratory and validation queries bounded unless there is strong evidence the table is small.

- Avoid unbounded freshness checks such as full-table `count()`, `uniqExact(...)`, or broad `min/max` scans on large fact tables. Prefer bounded recent-window checks, partition-aware filters, table metadata, or known date/key ranges, for example `WHERE report_date >= today() - 7`.
- For a quick metric over "last N days" from a daily aggregate table, default to completed report dates when appropriate and state that assumption; mention alternatives such as rolling N hours or including today if ambiguous.
- If an exact aggregate exceeds memory or times out, retry with smaller bounded chunks only when chunking preserves correctness. Daily counts can be queried week-by-week and concatenated because each date belongs to exactly one chunk.
- Do not chunk-and-sum distinct users across chunks unless the requested grain makes chunks independent. Weekly unique users cannot be produced by summing daily unique users, because a user can appear on multiple days.
- Document chunk boundaries, why the combined result remains exact, and the original failure mode in the SQL notes or artifact metadata.
- If no exact bounded fallback is safe, ask whether an approximate aggregate such as `uniq(...)`, a shorter window, or a different grain is acceptable.

## Result package

When returning query results, include:

- the SQL executed
- row count or aggregate count
- sample output or artifact path
- data freshness or observed time range
- caveats and the next query if needed

## Auth and secret handling

- Never print API keys, secrets, or passwords into the conversation or commit them.
- For Cloud analytics: use the configured direct Query API endpoint with explicit per-user `CH_API_KEY` / `CH_API_SECRET` credentials. If credentials are missing, stop and prompt the user to set them. Do not fall back to shared or default credentials.
- Do not use `clickhousectl cloud service query` for Cloud analytics; it depends on local service-query-key state and may auto-provision keys.
- For local servers: no cloud credentials needed.
- `clickhousectl cloud auth logout` clears saved clickhousectl OAuth tokens and API keys, but does not manage the per-user `CH_API_KEY` / `CH_API_SECRET` environment variables.
