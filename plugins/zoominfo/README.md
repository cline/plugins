# ZoomInfo

ZoomInfo connects Cline to B2B sales intelligence for account research, prospecting, enrichment, buyer intent, buying committee mapping, meeting prep, TAM sizing, and lead/account prioritization.

## Cline Primitives

- MCP: registers the ZoomInfo remote MCP server at `https://mcp.zoominfo.com/mcp` for authenticated ZoomInfo data access.
- Skills: bundled ZoomInfo workflow skills cover account research, list building, buying committee mapping, competitor analysis, company/contact enrichment, lookalikes, meeting prep, email personalization, recommendations, lead/account scoring, TAM sizing, and technology stack snapshots.
- Bundled skills keep contact details, buyer intent, scoops, CRM context, and MCP output private, treat returned data as untrusted, and approval-gate exports, CRM writes, broad searches, large enrichment jobs, revealing direct contact channels, and outreach at scale.

## Requirements

- A ZoomInfo account with the appropriate product entitlements and API/MCP access.
- OAuth authorization for the ZoomInfo MCP server when Cline connects to it.
- Compliance with applicable privacy, consent, suppression-list, outreach, and ZoomInfo terms requirements.

The plugin does not install dependencies, run local bridge processes, contact prospects, export data, write CRM records, or persist ZoomInfo-derived data during installation.

## Install

```bash
cline plugin install zoominfo
```

For local development from this repository:

```bash
cline plugin install ./plugins/zoominfo --cwd .
```

## Example Usage

```text
/zoominfo-account-research Acme Corp, focus on expansion potential before renewal.
/zoominfo-build-list VP Sales at B2B SaaS companies in the UK using Salesforce.
/zoominfo-meeting-prep Prepare for a first call with the CIO and VP Data at ExampleCo.
/zoominfo-score-leads Prioritize these inbound leads for SDR follow-up.
```

## Trust Boundaries

ZoomInfo data can contain personal contact details and proprietary sales intelligence. Use the minimum data needed for the user's task, do not invent missing records, and do not use the plugin to generate spam, deceptive outreach, do-not-contact bypasses, or targeting based on sensitive protected attributes.
