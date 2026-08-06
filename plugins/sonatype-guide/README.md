# sonatype-guide

Sonatype Guide integration for dependency security, version recommendations, license and policy checks, malicious package detection, and supply-chain risk review.

## What It Adds

This plugin bundles a Sonatype Guide dependency review skill and conditionally registers the `sonatype-guide` remote MCP server when `SONATYPE_GUIDE_TOKEN` is available in the Cline environment.

If the token is missing, the plugin still installs the skill, but it does not register the MCP server. Set the token, then reinstall or re-enable the plugin so Cline can sync the plugin-owned MCP settings entry.

## Cline Primitives

- MCP: `sonatype-guide` connects to Sonatype Guide over Streamable HTTP with a bearer token from `SONATYPE_GUIDE_TOKEN`.
- Skills: dependency evaluation, upgrade advice, project audits, package comparisons, PURL construction, vulnerability interpretation, and policy compliance review.

## Requirements

- Sonatype Guide account and API token.
- `SONATYPE_GUIDE_TOKEN` set in the environment where Cline loads plugins.
- Network access to `https://mcp.guide.sonatype.com/mcp`.

For example:

```bash
export SONATYPE_GUIDE_TOKEN="your-token"
cline plugin install sonatype-guide
```

## Trust Boundaries

The MCP Authorization header is persisted in Cline's plugin-owned MCP settings while the plugin is installed or enabled. Disabling or uninstalling the plugin removes the plugin-owned MCP entry.

When MCP tools are used, package coordinates from manifests or lockfiles are sent to Sonatype Guide for analysis. Sonatype Guide output can include vulnerability, license, policy, dependency, and package metadata. Treat it as private and untrusted. Ask before changing manifests, lockfiles, dependency versions, or running package manager install/update commands.
