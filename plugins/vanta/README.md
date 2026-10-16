# vanta

Vanta compliance remediation workflows for Cline.

## What It Does

Registers Vanta MCP servers for the US, EU, and Australia regions and installs skills for listing failing compliance tests, triaging which failures are fixable from the current repository, and remediating specific tests with minimal code or infrastructure changes.

The regional MCP servers expose Vanta compliance-platform tools for failing tests, remediation context, controls, framework mappings, evidence, vendors, vulnerabilities, policies, and compliance gaps. Users authorize the region that matches their Vanta tenant.

## Cline Primitives

- MCP: `vanta-us`, `vanta-eu`, and `vanta-aus` remote MCP servers.
- Skills: `vanta-test-remediation`, `vanta-list-tests`, and `vanta-fix-test`.
- Bundled skills cover compliance, cloud, evidence, vendor-risk, and repository-change workflows.

## Install

```bash
cline plugin install vanta
```

For local development from this repository:

```bash
cline plugin install ./plugins/vanta --cwd .
```

## Example Usage

After installation, ask Cline:

```text
/vanta-list-tests
```

or:

```text
/vanta-fix-test cloudtrail-log-file-validation
```

## Requirements

- A Vanta account with access to MCP. Vanta currently requires an Admin role for MCP access.
- Authorization for the Vanta MCP server that matches the tenant region.
- Repository access to the infrastructure or application code that manages the failing test's resources.

## Security Notes

Setup registers remote MCP servers and installs bundled skills only. It does not call Vanta APIs, inspect compliance data, change infrastructure, upload policies, create branches, or open PRs during installation.

Remediation work can touch compliance posture, cloud resources, security controls, evidence, vendors, and repository code. The bundled skills require explicit approval before live changes and forbid weakening security controls for convenience.

## Attribution

Bundled Vanta skills are derived from Vanta MCP plugin materials, licensed under MIT. See `LICENSE.vanta` and `NOTICE.vanta`.
