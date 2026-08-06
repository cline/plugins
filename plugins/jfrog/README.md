# jfrog

Adds JFrog Platform workflow skills for Cline.

## What It Does

This plugin ships two bundled skills:

- `jfrog`: Guides Cline through JFrog Platform work with Artifactory, Xray, access tokens, projects, release bundles, build metadata, and REST or GraphQL fallbacks.
- `jfrog-package-safety-and-download`: Guides package safety checks and downloads through JFrog Public Catalog, stored packages, curation policy, and Artifactory remote caches.

The plugin does not register an MCP server and does not run startup hooks. Cline uses the user configured JFrog CLI and explicit tool calls when a JFrog task requires local commands or network access.

## Install

```bash
cline plugin install jfrog
```

For local development from this repository:

```bash
cline plugin install ./plugins/jfrog --cwd .
```

## Example Usage

After installation, ask Cline:

```text
List the Artifactory repositories in my default JFrog server and summarize which ones are remote caches.
```

Or:

```text
Check whether lodash 4.17.21 is allowed by our JFrog package curation policy before I add it.
```

## Requirements

- JFrog Platform URL and access token.
- JFrog CLI `jf` configured with the target server when CLI operations are needed.
- `curl` and `jq` for API and GraphQL workflows.
- Network access to the relevant JFrog services.

## Security Notes

JFrog operations can read or mutate artifact repositories, security policies, users, tokens, projects, and release lifecycle state. The bundled skills require Cline to resolve exactly one target server before acting, prefer read operations first, and require explicit user confirmation for destructive or privileged mutations.

Maven, npm, PyPI, Go, NuGet, Docker, and other package downloads can introduce supply-chain risk. Package downloads should go through the configured JFrog repositories or curation-aware flow, and Cline should stop when a package is blocked by policy.
