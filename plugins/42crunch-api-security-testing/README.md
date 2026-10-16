# 42crunch-api-security-testing

42Crunch API security testing workflows for Cline.

## What It Does

Installs skills for creating OpenAPI specs, configuring 42Crunch credentials, running static API security audits, running live conformance and authorization scans, and coordinating the full audit plus scan workflow.

The skills focus on developer-time API security work:

- generate an OpenAPI 3 spec from API source code
- convert a Postman collection to OpenAPI
- set up the `42c-ast` command line tool and credentials
- audit OpenAPI files for security and data validation issues
- scan a running API for conformance, BOLA, and BFLA style authorization failures
- apply fixes only after user approval

## Install

```bash
cline plugin install 42crunch-api-security-testing
```

For local development from this repository:

```bash
cline plugin install ./plugins/42crunch-api-security-testing --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Generate an OpenAPI spec for this API and run a 42Crunch audit on it.
```

or:

```text
Run a 42Crunch scan against my local API at http://localhost:8080.
```

## Cline Primitives

- Skills: bundles six workflow skills: `42crunch-setup`, `code-to-oas`, `postman-to-oas`, `42crunch-audit`, `42crunch-scan`, and `42crunch-api-security-testing`.
- References: includes the detailed 42Crunch audit, scan, setup, tag, reachability, and scan configuration workflow references used by the skills.

## Requirements

- A 42Crunch Platform API key or Free Trial token for audit and scan workflows.
- The `42c-ast` binary. The setup skill guides installation and update, but does not silently write credentials.
- An OpenAPI 3 JSON or YAML file for audit and scan workflows.
- A reachable API server for live scan workflows.

## Security Notes

42Crunch credentials are secrets. The skills tell Cline not to print, commit, or persist API keys without explicit user approval. Live scans can send test traffic to the configured API target, so the skills require user confirmation before running scans or applying fixes.

The bundled 42Crunch skill material is Apache-2.0 licensed; see `LICENSE.42crunch-api-security-testing`.
