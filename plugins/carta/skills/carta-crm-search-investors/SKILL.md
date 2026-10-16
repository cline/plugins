---
name: carta-crm-search-investors
description: >
  Searches for and retrieves investor records from the Carta CRM.
  Use this skill when the user says things like "find an investor", "search investors",
  "look up an investor", "show me investor details for [name]", "get investor by ID",
  "list investors", "what investors do we have", or "/search-investors".
  Returns investor details including ID, name, and custom fields.
  The investor ID returned can be used with the update-investor skill.
version: 1.0.0
model: haiku
---

## Overview

Search for investors in the Carta CRM. If the user provided an ID, fetch the single
record directly. Otherwise use the search tool and return results in a readable summary.
Always surface the investor ID so the user can reference it for updates.

## Step 1 -- Determine search mode

- By ID -- user provided an investor ID -> call `get_investor`
- By name / keyword -- user provided a name or description -> call `search_investors`

If it's unclear, default to search and ask the user for a name or keyword.

## Step 2 -- Execute the search

By ID:
```
mcp__carta__get_investor({ id: "<investor id>" })
```

By name / keyword:
```
mcp__carta__search_investors({
  query: "<search term>",
  limit: 20
})
```

Increase `limit` if the user asks to see more results. Use `offset` to paginate.

## Step 3 -- Present results

For each investor returned, display all non-empty fields in a readable summary.
Always show the ID prominently -- the user will need it to run `/update-investor`.

If no investors are found:
> "No investors found matching your search. Try a different name or keyword."

If multiple results are returned, list them all and note the total count.
