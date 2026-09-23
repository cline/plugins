---
name: carta-crm-search-deals
description: >
  Searches for and retrieves deal records from the Carta CRM.
  Use this skill when the user says things like "find a deal", "search deals",
  "look up a deal", "show me deals for [company]", "get deal by ID", "find deal in [stage]",
  "list deals", "what deals do we have for [company]", or "/search-deals".
  Returns deal details including ID, company, stage, pipeline, tags, and custom fields.
  The deal ID returned can be used with the update-deal skill.
version: 1.0.0
model: haiku
---

## Overview

Search for deals in the Carta CRM. If the user provided an ID, fetch that deal
directly. Otherwise use `search_deals` with filters. Always surface the deal ID
so the user can reference it for updates.

Important: Call `get_deal_fields` before every `search_deals` call to discover
valid field IDs for filters. Do not skip this step.

## Step 1 -- Fetch deal fields

Always call this before searching:

```
mcp__carta__get_deal_fields()
```

Read the field IDs, types, and descriptions carefully. Map the user's intent to the
most specific matching field(s) and use those in the `filters` parameter.

## Step 2 -- Determine search mode

- By ID -- user provided a deal ID -> call `fetch_deal_by_deal_id`
- By filters / keyword -- user provided a company name, stage, or criteria -> call `search_deals`

## Step 3 -- Execute the search

By ID:
```
mcp__carta__fetch_deal_by_deal_id({ id: "<deal id>" })
```

By filters:
```
mcp__carta__search_deals({
  query: "<free-text search -- last resort only>",
  stages: ["<stage id>"],
  filters: [
    { field_id: "<field id>", operator: "eq", value: "<value>" }
  ],
  limit: 50
})
```

Prefer `filters` over `query` whenever a specific field matches the user's intent.
Available operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`, `between`.
Use `stages` to filter by pipeline stage (funnel, tracking, due-diligence, execution, dead, completed).

Increase `limit` or use `offset` to paginate if `remainingCount > 0`.

## Step 4 -- Present results

For each deal returned, display all non-empty fields in a readable summary.
`fetch_deal_by_deal_id` returns full detail including all notes and linked people -- surface those if relevant.
Always show the deal ID prominently -- the user will need it to run `/update-deal`.

If no deals are found:
> "No deals found matching your search. Try a different company name or adjust the filters."

Note the total count and offer to paginate if there are more results.
