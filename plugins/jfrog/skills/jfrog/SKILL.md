---
name: jfrog
description: Use this skill for JFrog Platform tasks involving Artifactory repositories and artifacts, Xray security scans, access tokens, users, groups, projects, build metadata, release bundles, evidence, AppTrust, curation, OneModel GraphQL, or JFrog CLI setup.
---

# JFrog Platform

Use this skill when the user wants Cline to work with JFrog Platform resources through the user's configured JFrog CLI and APIs.

## Requirements

Before running JFrog commands, verify the needed local tools:

- `jf` for JFrog CLI workflows
- `curl` for REST and GraphQL requests
- `jq` for JSON parsing

If `jf` is missing, explain that the user needs to install the JFrog CLI and configure a server. Do not run interactive setup commands unless the user explicitly asks for setup help.

## Server Selection

Resolve exactly one target server before any operation:

1. If the user names a server id, use only that server with `--server-id`.
2. If the user does not name a server, inspect `jf config show` and use only the current default server.
3. If there is no default or the named server is missing, stop and ask the user which server to use.

Never fall back to another configured server after an error. A different server can hold different permissions, repositories, packages, and users.

## Authentication

Prefer existing `jf` configuration. For plain REST or GraphQL calls outside Artifactory and Xray, extract only the fields needed for the request. Do not print the decoded JFrog config:

```bash
CONFIG_JSON=$(jf config export <server-id> | base64 -d)
JFROG_URL=$(printf '%s' "$CONFIG_JSON" | jq -r '.url // empty' | sed 's:/*$::')
JFROG_ACCESS_TOKEN=$(printf '%s' "$CONFIG_JSON" | jq -r '.accessToken // empty')
unset CONFIG_JSON
```

Use the base URL and access token only for the same resolved server. Do not print access tokens in chat, write them to files, or include them in command output.

## Command Discovery

Check help before using a command you are unsure about:

```bash
jf --help
jf rt --help
jf xr --help
jf <command> --help
```

Common namespaces:

- `jf rt`: Artifactory repositories, files, builds, permissions, users, groups, replication, properties, and AQL through REST.
- `jf xr`: Xray watches, policies, violations, scans, curation, and security findings.
- `jf config`: local server configuration.
- `jf evd`: evidence.
- `jf at` or `jf apptrust`: AppTrust.
- `jf ds`: Distribution and release lifecycle.

Do not use JFrog Pipelines APIs or `jf pl`; that product is sunset.

## Execution Rules

Before each JFrog operation:

1. Confirm the operation is needed for the user's request.
2. Resolve the server using the rules above.
3. Prefer read-only discovery before mutation.
4. Confirm with the user before create, update, delete, upload, token creation, permission changes, promotion, distribution, or any other privileged mutation. For high-impact actions, confirm after resolving the exact server and target resource, even if the user initially asked for the action.
5. If a command fails with auth, permission, network, or not-found errors, stop and report the exact failure. Do not retry against another server.
6. Do not invent helper mutations to satisfy preconditions. If an artifact, repo, build, project, or package is missing, report the gap and ask before creating, copying, uploading, or moving anything.

## REST and GraphQL Patterns

Use `jf rt curl` for Artifactory APIs:

```bash
jf rt curl -s -XGET /api/repositories --server-id <server-id> | jq .
```

Use `jf xr curl` for Xray APIs:

```bash
jf xr curl -s -XGET /api/v2/watches --server-id <server-id> | jq .
```

For other platform APIs, use `curl` with credentials from the same resolved server.

For OneModel GraphQL, build JSON with `jq -n --arg` instead of manually escaping a GraphQL string:

```bash
QUERY='{ storedPackages { searchPackages(first: 5) { totalCount } } }'
PAYLOAD=$(jq -n --arg q "$QUERY" '{"query": $q}')
curl -s -XPOST "$JFROG_URL/onemodel/api/v1/graphql" \
  -H "Authorization: Bearer $JFROG_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" | jq .
```

Save network responses to temp files when parsing may need retries:

```bash
OUT="/tmp/jfrog-response-$$.json"
jf rt curl -s -XGET /api/repositories --server-id <server-id> > "$OUT"
echo "$OUT"
jq . "$OUT"
```

Do not repeat the same network request just to retry a `jq` filter.

## Query and Operation Guidance

- Artifacts and remote cache content: prefer direct Artifactory REST or AQL through `jf rt curl`; avoid broad unbounded searches.
- Build metadata: include project or build repo scope when required by the server.
- Xray findings: distinguish violations, vulnerabilities, contextual analysis, curation blocks, and policy definitions.
- Access tokens: confirm scope, audience, expiry, and target user before creation.
- Projects and permissions: read existing membership and roles before proposing changes.
- Release lifecycle: inspect current bundle, stage, evidence, and promotion status before mutating.
- GraphQL schemas can differ by deployment. If a GraphQL query fails validation, fetch the schema from the same server and adjust the query rather than guessing fields.

## Safety Defaults

- Use non-interactive commands. Avoid `jf config add`, `jf login`, and template wizard commands during normal workflows.
- Do not expose secrets in responses.
- Do not write reports, temporary JSON, or generated files into the user's repository unless asked.
- Use temp files under `/tmp` for transient API responses.
- Keep package and artifact downloads in a user-approved destination.
- Treat JFrog server data as sensitive company data.
