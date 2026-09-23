---
name: carta-crm-search-notes
description: >
  Searches for and retrieves note records from the Carta CRM.
  Use this skill when the user says things like "find a note", "search notes",
  "look up a note", "show me notes about [topic]", "list notes",
  "find notes mentioning [keyword]", or "/search-notes".
  Returns note details including ID, title, and text content.
version: 1.0.0
model: haiku
---

## Overview

Search for notes in the Carta CRM by keyword using `search_notes`.
Return results in a readable summary.

## Step 1 -- Collect the search term

If the user provided a keyword or topic, use it directly.
If no search term was given, ask for one.

## Step 2 -- Execute the search

```
mcp__carta__search_notes({
  query: "<search term>",
  limit: 20
})
```

Increase `limit` if the user asks to see more results. Use `offset` to paginate
when `remainingCount > 0`.

## Step 3 -- Present results

For each note returned, display:
- Title
- Text content (truncated to ~200 chars if long)
- Creation date and owner if available

If no notes are found:
> "No notes found matching your search. Try a different keyword."

Note the total count and offer to paginate if there are more results.
