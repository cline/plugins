# Carta

Carta adds one Carta MCP connection plus a focused Cline skill pack for cap table workflows, Carta CRM, investor reporting, budgeting, compensation benchmarks, equity scenarios, and safe handling of sensitive financial data.

This is a consolidated Cline plugin because Carta cap table, CRM, and investors workflows all use the same Carta MCP endpoint. A single plugin avoids duplicate MCP entries while still exposing focused skills for each user workflow.

## Cline Primitives

- `mcp`: registers the Carta MCP server at `https://mcp.app.carta.com/mcp`. Interactive Cline sessions can prompt for OAuth authorization before live Carta access.
- `skills`: bundles focused skills for cap table topics, compensation benchmarks and role mapping, Carta CRM search/create/update workflows, investor data exploration, fund benchmarks, tearsheets, Form ADV support, co-investor analysis, and workbook-based budgeting/accounting reports. The plugin also keeps small router skills for common Carta domains so Cline can choose the right detailed workflow.

## Install

```bash
cline plugin install carta
```

For local development from this repository:

```bash
cline plugin install ./plugins/carta --cwd .
```

## Example Usage

After installation and Carta OAuth authorization, ask Cline:

```text
Show the ownership breakdown for the company I have access to in Carta and call out any expiring 409A valuation.
```

## Requirements

- Carta account access for the requested cap table, CRM, investor, or fund data.
- OAuth authorization for the Carta MCP server when prompted by Cline.
- Permission to view or change the requested Carta records.
- Explicit user approval before creating or updating CRM records, exporting files, generating workbooks, or scanning broad portfolios.
- Python 3 and `uv` for local workbook/report generation workflows that use the bundled helper scripts. The plugin bundles the scripts, but it does not install Python or `uv`.

If a user already has a manual MCP server named `carta`, Cline keeps that server and skips the plugin-owned registration until the manual entry is renamed or removed.

## Trust Boundaries

Carta data can include confidential ownership, compensation, fund, investor, company, contact, deal, note, and signature information. The plugin keeps live Carta access behind OAuth, avoids duplicate MCP registrations, and tells Cline to protect credentials and sensitive data while avoiding legal, tax, investment, compensation, or securities advice.

Some Carta workflows rely on host-specific runtime helpers for automatic session hooks, Excel add-ins, and live artifact sidebars. This Cline plugin does not run those hooks or expose unsupported artifact surfaces. Skills that generate reports or workbooks use explicit user-approved local files instead.
