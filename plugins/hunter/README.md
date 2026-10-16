# hunter

Adds Hunter prospecting workflows to Cline with bundled skills and the Hunter MCP server.

## What It Adds

This plugin includes Cline skills for common Hunter workflows:

- Finding professional email addresses from a name and company.
- Searching company domains for public contacts.
- Verifying deliverability before outreach.
- Enriching company and person records.
- Discovering companies by criteria.
- Building lead lists and preparing campaign recipients.
- Running end-to-end prospecting workflows with credit-aware checkpoints.

It also registers the `hunter` MCP server at `https://mcp.hunter.io/mcp`. The MCP server exposes Hunter tools for contact search, email verification, enrichment, lead-list management, and campaign recipient workflows.

## Requirements

The MCP server requires a Hunter account and authentication through the Hunter MCP flow. Hunter plan limits and credit costs apply.

## Trust Boundary

Hunter workflows can reveal personal contact data, consume search or verification credits, save leads, and add recipients to campaigns. Cline should confirm bulk credit usage, list/campaign mutations, and any outreach-adjacent action before making changes.
