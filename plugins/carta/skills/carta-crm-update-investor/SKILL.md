---
name: carta-crm-update-investor
description: >
  Updates an existing investor record in the Carta CRM.
  Use this skill when the user says things like "update an investor", "edit investor",
  "update investor details", "change investor name", "update investor website",
  "update investor fields", "add a tag to investor", or "/update-investor".
  Accepts an investor ID or name (will search if no ID provided).
  Only the fields explicitly provided are changed -- all other fields are left untouched.
version: 1.0.0
model: haiku
---

## Overview

Partially update an existing investor. Only fields provided are modified -- this is
a partial update, not a replacement. First resolve the investor ID, collect what to
change, then call the update tool.

## Step 1 -- Resolve the investor ID

If the user provided an investor ID directly, use it and skip to Step 3.

If only a name or description was given, search first:

```
mcp__carta__search_investors({ query: "<name>", limit: 10 })
```

If multiple investors match, present the list and ask the user to confirm which one
to update (show name and ID for each).

## Step 2 -- Collect what to update

Ask the user what they want to change:
- name -- investor firm name
- fields -- custom field values keyed by field ID (e.g. website, location, industry, about, tags)

If the user wants to update custom fields but isn't sure of field IDs, fetch the schema first:

```
mcp__carta__get_investor_custom_fields()
```

If the user has already specified what to change in their message, extract it directly
without re-asking.

Important: Only include fields that are explicitly being changed. Omit everything else.

## Step 3 -- Update the investor

Call:

```
mcp__carta__update_investor({
  id: "<investor id>",
  name: "<updated name>",
  fields: {
    "<field_id>": "<value>"
  }
})
```

Omit `name` if it is not being changed. Omit `fields` if no custom fields are changing.
Only include the specific keys within `fields` that are being updated.

## Step 4 -- Report result

On success, respond with a summary of what changed:
> "Investor {name} updated (ID: `{id}`). Changed: [list of changed fields]"

On error, show the error message and suggest:
- Verify the investor ID is correct -- run `/search-investors` to find it
- Check that custom field IDs are valid

## Updating multiple investors

If the user wants to apply the same change to multiple investors, repeat Steps 1 and 3-4
for each. Summarize at the end:
> "Updated N investors: [list of names]"
