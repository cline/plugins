---
name: carta-crm-add-note
description: >
  Adds a comment/note to a deal record in the Carta CRM via the Carta CRM MCP Server.
  Use this skill when the user says things like "add a note", "create a note",
  "log a note", "add note to a deal", "add note to CRM", "add note to Carta CRM",
  "log a comment on a deal", or "/add-note".
  Notes are stored as comments on deal records.
version: 1.0.0
model: haiku
---

## Overview

In the Carta CRM MCP, notes are added as comments on deal records using the
`comment` field via `update_deal`. Help the user identify which deal to attach
the note to, collect the note content, then update the deal.

## Step 1 -- Identify the deal

Ask the user which deal the note is for. If they named a company or deal, search for it:

```
mcp__carta__get_deal_fields()
mcp__carta__search_deals({ query: "<company name>", limit: 10 })
```

If multiple deals match, present the list and ask which one to attach the note to.

If the user provided a deal ID directly, skip the search.

## Step 2 -- Collect the note content

Ask the user for:
- Note text (required) -- the content of the note

If the user has already provided the note content in their message, extract it directly
without re-asking.

Optionally show the existing comment on the deal (from `fetch_deal_by_deal_id`) so the
user knows whether they're replacing or appending.

## Step 3 -- Add the note to the deal

Call:

```
mcp__carta__update_deal({
  id: "<deal id>",
  comment: "<note content>"
})
```

Note: `comment` replaces the existing deal comment. If the deal already has a comment
and the user wants to append, combine the existing text with the new content and confirm
before saving.

## Step 4 -- Report result

On success, respond with:
> "Note added to deal {company name} (ID: `{id}`)."

On error, show the error message and suggest:
- Verify the deal ID is correct -- run `/search-deals` to find it
