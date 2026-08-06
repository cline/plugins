---
name: carta-crm-search-fundraisings
description: >
  Searches for and retrieves fundraising records from the Carta CRM.
  Use this skill when the user says things like "find a fundraising", "search fundraisings",
  "look up a fundraising round", "show fundraising details for [name]", "get fundraising by ID",
  "list fundraisings", "what fundraisings do we have", or "/search-fundraisings".
  Returns fundraising details including ID, name, stage, and custom fields.
  The fundraising ID returned can be used with the update-fundraising skill.
version: 1.0.0
model: haiku
---

## Overview

Search for fundraisings in the Carta CRM. If the user provided an ID, fetch the single
record directly. Otherwise use the search tool and return results in a readable summary.
Always surface the fundraising ID so the user can reference it for updates.

## Step 1 -- Determine search mode

- By ID -- user provided a fundraising ID -> call `get_fundraising`
- By name / keyword / stage -- user provided a name or stage -> call `search_fundraising`

If it's unclear, default to search and ask for a search term.

## Step 2 -- Execute the search

By ID:
```
mcp__carta__get_fundraising({ id: "<fundraising id>" })
```

By name / keyword:
```
mcp__carta__search_fundraising({
  query: "<search term>",
  limit: 20
})
```

If the user filtered by stage name, call `get_fundraising_stages` first to resolve
the name to a stage ID, then pass `stages: ["<stage id>"]`.

Increase `limit` if the user asks to see more results. Use `offset` to paginate.

## Step 3 -- Present results

For each fundraising returned, display all non-empty fields in a readable summary.
Always show the ID prominently -- the user will need it to run `/update-fundraising`.

If no fundraisings are found:
> "No fundraisings found matching your search. Try a different name or keyword."

Note the total count and offer to paginate if there are more results.
