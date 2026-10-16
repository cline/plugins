# pigment

Pigment planning and modeling guidance for Cline, with optional Pigment MCP registration.

## What It Does

Installs Pigment skills for analyzing workspace data, modeling applications, writing Pigment formulas, building boards and views, integrating external data, planning cycles, securing access rights, optimizing performance, and applying FP&A or workforce planning patterns.

The plugin can also register the Pigment MCP server when the user provides their workspace MCP URL. Pigment MCP gives Cline live access to the user's Pigment workspace through Pigment's OAuth flow. Default Pigment MCP tools are read-oriented for analysis. Pigment Advanced MCP tools can create or edit modeling objects when the user enables advanced tools in Pigment.

## Install

```bash
cline plugin install pigment
```

For local development from this repository:

```bash
cline plugin install ./plugins/pigment --cwd .
```

## Enable Pigment MCP

Pigment generates a workspace-specific MCP URL under Pigment settings:

```text
Settings > Integrations > MCP
```

Set that URL before installing or re-enabling the plugin:

```bash
export CLINE_PIGMENT_MCP_URL="https://pigment.app/api/mcp/public/your-mcp-id"
cline plugin install pigment
```

If `CLINE_PIGMENT_MCP_URL` is not set, the plugin still installs the Pigment skills, but it does not create a Pigment MCP settings entry.

## Example Usage

After installation, ask Cline:

```text
Review this Pigment formula for correctness and performance before I apply it.
```

With Pigment MCP configured, ask:

```text
List my Pigment applications, find the revenue metrics in the FP&A model, and explain which ones are enabled for AI data access.
```

## Requirements

- A Pigment workspace.
- Pigment MCP enabled in `Settings > Integrations > MCP` when live workspace access is needed.
- Pigment OAuth in Cline's MCP flow after the MCP server is registered.
- Advanced MCP tools enabled in Pigment only when Cline should help create or edit modeling objects.

## Security Notes

Pigment data and model changes can affect financial planning workflows. The bundled skills require explicit confirmation before Cline uses advanced MCP tools for writes, imports, access-right changes, board or view edits, scenario or snapshot changes, and deletions.

Advanced MCP search can expose block metadata and application logic, including names, data types, dimensions, and model structure, even when it does not expose actual metric data. Treat that metadata as sensitive workspace context and avoid putting secrets in Pigment block names or metadata.

The bundled skills are licensed by Pigment for use with Pigment services. See `LICENSE.pigment-skills`. The bundled markdown has been format-normalized for this repository's validation rules and is not represented as an official or endorsed Pigment distribution.
