---
name: carta-crm-update-note
description: >
  Searches for notes in the Carta CRM and helps the user update deal comments.
  Use this skill when the user says things like "update a note", "edit note",
  "update note content", "change a note", or "/update-note".
  Note: standalone note editing is not available via MCP -- notes/comments are
  attached to deals and updated via the update-deal skill.
version: 1.0.0
model: haiku
---

## Overview

Notes in the Carta CRM MCP are accessible via `search_notes` but are edited as
`comment` fields on deal records via `update_deal`. Help the user find the note
they want to change, then update the associated deal's comment.

## Step 1 -- Find the note

Search for the note by keyword:

```
mcp__carta__search_notes({ query: "<keyword>", limit: 10 })
```

Show the results to the user and ask which note they want to update.

## Step 2 -- Identify the associated deal

Once the user has selected a note, find the deal it belongs to. Ask the user for
the deal name/company, or search:

```
mcp__carta__get_deal_fields()
mcp__carta__search_deals({ query: "<company name>", limit: 10 })
```

Fetch the deal to show the current comment:
```
mcp__carta__fetch_deal_by_deal_id({ id: "<deal id>" })
```

## Step 3 -- Collect the updated content

Show the user the existing comment and ask what they'd like to change.

## Step 4 -- Update the deal comment

Call:

```
mcp__carta__update_deal({
  id: "<deal id>",
  comment: "<updated note content>"
})
```

## Step 5 -- Report result

On success, respond with:
> "Note updated on deal {company name} (ID: `{id}`)."

On error, show the error message and suggest verifying the deal ID by running
`/search-deals`.
