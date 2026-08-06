---
name: buildkite-api
description: >
  This skill should be used when the user asks to "call the Buildkite API",
  "use the REST API", "write a GraphQL query", "set up webhooks",
  "automate Buildkite", "integrate with Buildkite programmatically",
  "write a script that calls Buildkite", "handle webhook events",
  "paginate API results", or "authenticate with the Buildkite API".
  Also use when the user mentions api.buildkite.com, graphql.buildkite.com,
  Buildkite REST endpoints, GraphQL mutations, webhook payloads,
  API tokens, or asks about programmatic access to Buildkite data.
---

# Buildkite API

Buildkite exposes a REST API and a GraphQL API for programmatic automation, plus webhooks for event-driven integrations. Use the REST API for straightforward CRUD operations on builds, pipelines, and organizations. Use the GraphQL API for mutations (queue creation, template management, cluster operations) and when fetching nested or specific fields. Use webhooks to react to build and agent events in real time.

> To execute API calls interactively from the terminal, see the buildkite-cli skill for `bk api` commands. To use the Buildkite MCP server for direct agent access to builds, logs, and pipelines, the MCP server exposes its own tool schemas - no API construction needed.

Before making API calls that create, retry, cancel, update, delete, or download sensitive data, get explicit user approval for the organization, pipeline, build, and action. Keep bearer tokens in environment variables or secret managers, and never paste tokens, full job environment dumps, or unredacted logs into chat.

## Quick Start

List builds for a pipeline using the REST API:

```bash
curl -sS -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  "https://api.buildkite.com/v2/organizations/my-org/pipelines/my-pipeline/builds?per_page=5" | jq '.[].state'
```

Query the same data via GraphQL:

```bash
curl -sS -X POST "https://graphql.buildkite.com/v1" \
  -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ pipeline(slug: \"my-org/my-pipeline\") { builds(first: 5) { edges { node { state message } } } } }"
  }' | jq '.data.pipeline.builds.edges[].node'
```

## Authentication

### Bearer Token

All API requests require a Buildkite API access token passed as a Bearer token:

```bash
curl -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  "https://api.buildkite.com/v2/organizations"
```

Create tokens at Buildkite → Personal Settings → API Access Tokens. Each token is scoped to specific organizations and permissions.

### Token Scopes

| Scope | Grants access to |
|-------|-----------------|
| `read_builds` / `write_builds` | List/inspect or create/cancel/retry builds |
| `read_pipelines` / `write_pipelines` | List/inspect or create/update/delete pipelines |
| `read_artifacts` / `write_artifacts` | Download or upload/delete artifacts |
| `read_build_logs` / `write_build_logs` | Read or delete job log output |
| `read_agents` / `write_agents` | List/inspect or stop/manage agents |
| `read_organizations` | List organizations |
| `read_teams` | List teams and memberships |
| `read_job_env` | Retrieve job environment variables |
| `read_user` | Inspect the authenticated user |
| `read_clusters` / `write_clusters` | List/inspect or manage clusters and queues |
| `read_suites` / `write_suites` | List/inspect or manage Test Engine suites |
| `read_registries` / `write_registries` | List/inspect or manage package registries |

Grant the minimum scopes required. A CI automation script that only triggers builds needs `write_builds` and `read_pipelines` - nothing else.

### JWT Authentication (Public Key)

For machine-to-machine integrations without long-lived tokens, sign RS256 JWTs with claims `iss` (API token UUID), `iat` (within 10 seconds of server time), and `exp` (within 5 minutes of `iat`). Register the public key in Buildkite, then use the JWT as a bearer token.

```python
import jwt, time
now = int(time.time())
token = jwt.encode({"iss": "your-token-uuid", "iat": now, "exp": now + 300},
                   open("private_key.pem").read(), algorithm="RS256")
headers = {"Authorization": f"Bearer {token}"}
```

## REST API

Base URL: `https://api.buildkite.com/v2`

All responses return JSON. Use `Content-Type: application/json` for request bodies.

### Endpoint Reference

All endpoints are under `/organizations/{org.slug}`. Abbreviated as `/{org}` below.

| Resource | Endpoint | Methods | Scope |
|----------|----------|---------|-------|
| Organizations | `/organizations` | GET | `read_organizations` |
| Pipelines | `/{org}/pipelines` | GET, POST | `read_pipelines`, `write_pipelines` |
| Pipeline | `/{org}/pipelines/{slug}` | GET, PUT, PATCH, DELETE | `read_pipelines`, `write_pipelines` |
| Builds (org) | `/{org}/builds` | GET | `read_builds` |
| Builds (pipeline) | `/{org}/pipelines/{slug}/builds` | GET, POST | `read_builds`, `write_builds` |
| Build | `/{org}/pipelines/{slug}/builds/{num}` | GET | `read_builds` |
| Jobs | `/{org}/pipelines/{slug}/builds/{num}/jobs` | GET | `read_builds` |
| Job log | `/{org}/pipelines/{slug}/builds/{num}/jobs/{id}/log` | GET, DELETE | `read_build_logs` |
| Job env | `/{org}/pipelines/{slug}/builds/{num}/jobs/{id}/env` | GET | `read_job_env` |
| Artifacts (build) | `/{org}/pipelines/{slug}/builds/{num}/artifacts` | GET | `read_artifacts` |
| Artifact download | `/{org}/pipelines/{slug}/builds/{num}/artifacts/{id}/download` | GET | `read_artifacts` |
| Annotations | `/{org}/pipelines/{slug}/builds/{num}/annotations` | GET | `read_builds` |
| Agents | `/{org}/agents` | GET | `read_agents` |
| Agent tokens | `/{org}/agent-tokens` | GET, POST | `read_agents`, `write_agents` |
| Members | `/{org}/members` | GET | `read_organizations` |
| Webhooks | `/{org}/webhooks` | GET, POST | - |

### Pagination

REST responses are paginated using HTTP `Link` headers:

```
Link: <https://api.buildkite.com/v2/organizations/my-org/builds?page=2&per_page=30>; rel="next",
      <https://api.buildkite.com/v2/organizations/my-org/builds?page=5&per_page=30>; rel="last"
```

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `page` | `1` | - | Page number |
| `per_page` | `30` | `100` | Results per page |

Parse the `Link` header to follow `rel="next"` until no next link exists.

### List Builds

```bash
# Filter by state and branch
curl -sS -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  "https://api.buildkite.com/v2/organizations/my-org/pipelines/my-pipeline/builds?state=failed&branch=main"
```

Build list query parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `state` | Filter: `running`, `scheduled`, `passed`, `failed`, `blocked`, `canceled`, `skipped`, `finished` | `state=failed` |
| `state[]` | Multiple states | `state[]=running&state[]=scheduled` |
| `branch` | Branch name | `branch=main` |
| `commit` | Commit SHA | `commit=abc123` |
| `created_from` | Builds after (ISO 8601) | `created_from=2024-01-01T00:00:00Z` |
| `created_to` | Builds before (ISO 8601) | `created_to=2024-12-31T23:59:59Z` |
| `include_retried_jobs` | Include retried executions | `include_retried_jobs=true` |
| `meta_data` | Filter by metadata | `meta_data[deploy]=true` |

### Create a Build

```bash
curl -sS -X POST "https://api.buildkite.com/v2/organizations/my-org/pipelines/my-pipeline/builds" \
  -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commit": "HEAD",
    "branch": "main",
    "message": "Triggered via API",
    "env": {
      "DEPLOY_TARGET": "staging"
    },
    "meta_data": {
      "triggered_by": "automation"
    }
  }'
```

| Field | Required | Description |
|-------|----------|-------------|
| `commit` | Yes | Git ref, SHA, or `HEAD` |
| `branch` | Yes | Branch name |
| `message` | No | Build message (defaults to commit message) |
| `env` | No | Environment variables (object) |
| `meta_data` | No | Build metadata (object) - accessible via `buildkite-agent meta-data` |
| `clean_checkout` | No | Force clean checkout (`true`/`false`) |
| `ignore_pipeline_branch_filters` | No | Skip branch filtering rules |

Also supports `author` (object: `name`, `email`), `pull_request_id`, `pull_request_base_branch`, `pull_request_repository`.

### Rebuild a Build

```bash
curl -sS -X PUT "https://api.buildkite.com/v2/organizations/my-org/pipelines/my-pipeline/builds/42/rebuild" \
  -H "Authorization: Bearer $BUILDKITE_API_TOKEN"
```

### Cancel a Build

```bash
curl -sS -X PUT "https://api.buildkite.com/v2/organizations/my-org/pipelines/my-pipeline/builds/42/cancel" \
  -H "Authorization: Bearer $BUILDKITE_API_TOKEN"
```

### Download Artifacts

Two-step process: list artifacts for a build, then download by artifact ID. The download endpoint returns a redirect - use `-L` to follow it:

```bash
curl -sS -L -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  "https://api.buildkite.com/v2/organizations/my-org/pipelines/my-pipeline/builds/42/artifacts/$ARTIFACT_ID/download" \
  -o artifact.tar.gz
```

### Create a Pipeline

```bash
curl -sS -X POST "https://api.buildkite.com/v2/organizations/my-org/pipelines" \
  -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Pipeline",
    "cluster_id": "018e5a22-d14c-7085-bb28-db0f83f43a1c",
    "repository": "git@github.com:my-org/my-repo.git",
    "configuration": "steps:\n  - command: \"buildkite-agent pipeline upload\"",
    "default_branch": "main"
  }'
```

### Error Handling

API errors return JSON with a `message` field.

| Status code | Meaning | Common cause |
|-------------|---------|--------------|
| `401` | Unauthorized | Invalid or expired token |
| `403` | Forbidden | Token lacks required scope |
| `404` | Not found | Wrong org/pipeline slug, or insufficient permissions |
| `422` | Unprocessable entity | Invalid request body (missing required field, bad value) |
| `429` | Rate limited | Too many requests - read `Retry-After` header and wait |

## GraphQL API

Endpoint: `https://graphql.buildkite.com/v1`. The GraphQL API supports queries and mutations with cursor-based pagination. Use it for operations not available in the REST API (cluster management, pipeline templates, complex mutations) and when fetching nested or specific fields to reduce response size.

> For full query/mutation examples, pagination details, and introspection guidance, see `references/graphql-reference.md`.

### REST vs GraphQL Decision Guide

| Scenario | Use | Why |
|----------|-----|-----|
| Trigger a build | Either | Both support it; REST is simpler |
| List builds with filtering | REST | Better query parameter support |
| Fetch build + jobs + artifacts in one call | GraphQL | Single request, no N+1 |
| Create or update cluster queues | GraphQL | Not available in REST |
| Create pipeline templates | GraphQL | Not available in REST |
| Manage agent tokens | GraphQL | More control than REST |
| Simple CRUD on pipelines | REST | Simpler request/response |
| Audit events | GraphQL | `auditEvent` query available |
| Bulk operations on many pipelines | GraphQL | Fetch specific fields only, reduce payload size |

## Webhooks

Webhooks deliver HTTP POST requests to a specified URL when events occur in Buildkite. Use them for event-driven automation: failure notifications, auto-retry logic, deployment triggers, status dashboards. Configure via the REST API at `/{org}/webhooks` with a target URL, event subscriptions, and optional HMAC-SHA256 signature verification.

Most commonly used events: `build.finished` (react to build completion), `job.finished` (react to individual job results), `build.failing` (early failure notification). Agent events (`agent.connected`, `agent.disconnected`, etc.) and job lifecycle events are also available.

> For webhook creation parameters, payload structure, HTTP headers, signature verification code, and a complete handler example, see `references/webhooks.md`.

## Common Mistakes

| Mistake | What happens | Fix |
|---------|-------------|-----|
| Using pipeline slug as GraphQL `pipelineID` | Mutation fails with "not found" error | Query the pipeline first to get its `id` (base64-encoded GraphQL node ID), then use that in mutations |
| Missing `Content-Type: application/json` on POST requests | 422 error or empty response body | Always include `-H "Content-Type: application/json"` for POST/PUT/PATCH requests |
| Not following `Link` header pagination | Only get first 30 results, missing data | Parse the `Link` header for `rel="next"` and loop until no next link exists |
| Using `per_page` above 100 | Silently capped at 100, appears to work but data is incomplete | Set `per_page=100` maximum and paginate for larger result sets |
| Ignoring `429` rate limit responses | Subsequent requests fail or get blocked | Read the `Retry-After` header and wait before retrying |
| Comparing webhook signatures with `==` instead of timing-safe comparison | Vulnerable to timing attacks | Use `crypto.timingSafeEqual` (Node.js) or `hmac.compare_digest` (Python) |
| Sending `env` as a string instead of object in build creation | 422 error | `env` must be a JSON object: `{"KEY": "value"}`, not `"KEY=value"` |
| Using REST API for cluster/queue management | 404 - endpoints do not exist | Use the GraphQL API for cluster and queue operations (`clusterQueueCreate`, etc.) |

## Additional Resources

- `references/graphql-reference.md` - Full GraphQL query/mutation examples, pagination, introspection
- `references/webhooks.md` - Webhook creation, payload structure, signature verification, handler example
- `references/patterns.md` - Common API usage patterns: fetching failed builds, build success rates, triggering downstream pipelines

## Further Reading

- [Buildkite Docs for LLMs](https://buildkite.com/docs/llms.txt)
- [Buildkite REST API reference](https://buildkite.com/docs/apis/rest-api.md)
- [Buildkite GraphQL API documentation](https://buildkite.com/docs/apis/graphql-api.md)
- [Buildkite GraphQL Explorer](https://buildkite.com/docs/apis/graphql/graphql-tutorial.md)
- [Buildkite Webhooks guide](https://buildkite.com/docs/apis/webhooks.md)
- [API authentication and token management](https://buildkite.com/docs/apis/managing-api-tokens.md)
