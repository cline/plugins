---
name: airtable-records
description: Use this skill when reading, creating, updating, or deleting Airtable bases, tables, fields, views, pages, or records through the Airtable MCP server.
---

# Airtable Records

Use this skill for direct Airtable MCP work.

## Guardrails

- Confirm the target workspace, base, table, or interface page before writing.
- Do not ask users to paste Airtable tokens into chat.
- Read schema before constructing record payloads or filters.
- Confirm destructive actions, bulk updates, and schema changes.
- For write operations, summarize the proposed change before making it when the user has not already specified exact values.
- After visible Airtable work, use `airtable-link`.

## Workflow

1. Discover available workspaces, bases, tables, pages, or records using the Airtable MCP server.
2. Resolve names to IDs from MCP responses. Never invent `app`, `tbl`, `fld`, `viw`, `pag`, or `rec` IDs.
3. Read schema before filtering, creating fields, or writing records.
4. Use field IDs and typed values expected by the MCP tools.
5. For lists and searches, bound result size and use filters when possible.
6. For writes, prefer small batches that are easy to review.
7. Return a concise result and a specific Airtable link when the MCP response provides enough IDs.

## Safety

- Treat Airtable records as business data.
- Avoid dumping large tables into chat. Summarize and link instead.
- Redact obvious secrets or personal data unless the user explicitly needs those values.
- Do not delete records, fields, tables, or bases without explicit confirmation.
