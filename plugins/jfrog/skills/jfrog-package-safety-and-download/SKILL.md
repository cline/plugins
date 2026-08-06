---
name: jfrog-package-safety-and-download
description: Use this skill when the user asks whether a package is safe, approved, curated, allowed, present in JFrog, or should be downloaded through Artifactory for npm, Maven, PyPI, Go, NuGet, Docker, or similar ecosystems.
---

# JFrog Package Safety And Download

Use this workflow for package safety checks and package downloads through JFrog. For pure CVE lookups without a package download or approval question, use the base `jfrog` skill instead.

## Prerequisites

Read the `jfrog` skill first for server selection, authentication, command execution, and mutation safety. Resolve exactly one JFrog server before querying package state.

## Workflow

1. Identify the package ecosystem, name, and requested version. If the ecosystem is ambiguous, ask the user to choose.
2. Search JFrog Public Catalog for the public package.
3. If Public Catalog does not have it, search stored packages in the user's JFrog Platform.
4. Determine the version to evaluate. Use the requested version if given; otherwise use the latest version reported by the authoritative source.
5. Check whether that exact package version already exists in the user's JFrog Platform and record repository locations.
6. If it exists in local or federated storage, report that it can be downloaded from JFrog and provide the exact download approach.
7. If it exists only through a remote cache or is not cached, check whether curation is entitled and whether policy allows the package version.
8. If curation blocks the package, report the block and stop. Do not download around policy.
9. If allowed, download only through the approved Artifactory remote repository or curation-aware package manager path requested by the user.

## Public Catalog and Stored Package Queries

Use OneModel GraphQL through the same server resolved by the `jfrog` skill. Build payloads with `jq -n --arg` and save responses to temp files if more than one parsing pass is needed.

When the package type is known, query the exact type and name first. When the package type is unknown, search by name and ask the user to disambiguate if multiple ecosystems match.

Prefer these concepts when interpreting results:

- Public package: package metadata, latest version, security and catalog signals from JFrog Public Catalog.
- Stored package: package metadata and versions already known to the user's JFrog Platform.
- Package version locations: repositories and artifact paths where that exact version exists.

## Curation Check

If curation is available, use the Xray curation package status API before download:

```bash
BODY="/tmp/jfrog-curation-$$.json"
HTTP_CODE=$(jf xr curl -s -o "$BODY" -w "%{http_code}" \
  -XPOST "/api/v1/curation/package_status/all_repos" \
  -H "Content-Type: application/json" \
  -d '{"packageType":"npm","packageName":"lodash","packageVersion":"4.17.21"}' \
  --server-id <server-id>)
echo "$HTTP_CODE"
echo "$BODY"
```

Interpret HTTP results carefully:

- `200`: package version is allowed by curation policy.
- `403`: package version is blocked. Report the policy reason and stop.
- Other status: report the failure and ask how to proceed.

Supported package type values are usually lowercase values such as `npm`, `pypi`, `maven`, `go`, `nuget`, `docker`, and `gradle`.

## Download Guidance

Use a destination file path, not a bare directory, when downloading one artifact.

For local or federated Artifactory locations:

```bash
jf rt dl "<repositoryKey>/<artifactPath>" "./downloads/<filename>" --flat --server-id <server-id>
```

For remote repositories, prefer the proxy endpoint when the artifact may not already be cached. If OneModel returns a `-cache` repository key, remove the `-cache` suffix to form the parent remote repository key for proxy endpoints.

Common protocol path patterns:

- npm: `/api/npm/<repo>/<pkg>/-/<pkg>-<version>.tgz`
- PyPI: `/api/pypi/<repo>/packages/<pkg>/<version>/<pkg>-<version>.tar.gz`
- Maven: `/<repo>/<group-path>/<artifact>/<version>/<artifact>-<version>.jar`
- Go: `/api/go/<repo>/<module>/@v/<version>.zip`

Always use redirects for binary downloads through remote endpoints:

```bash
jf rt curl -s -L -XGET "/api/npm/<repo>/<path>" -o "./downloads/<filename>" --server-id <server-id>
```

## Guardrails

- Do not download a package that curation blocks.
- Do not bypass JFrog by downloading directly from the public internet unless the user explicitly requests it after seeing the JFrog result.
- Do not infer safety from popularity alone. Prefer JFrog catalog, stored package, Xray, and curation signals.
- Do not mutate repository configuration to make a package downloadable unless the user explicitly asks.
- Do not retry against another JFrog server after auth, permission, network, or not-found errors.
- Ask before writing package files into the repository. Prefer a user-approved downloads directory.
