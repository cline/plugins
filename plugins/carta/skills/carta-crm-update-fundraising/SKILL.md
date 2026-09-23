---
name: carta-crm-update-fundraising
description: >
  Updates an existing fundraising record in the Carta CRM.
  Use this skill when the user says things like "update a fundraising", "edit fundraising",
  "update fundraising details", "change fundraising stage", "update fundraising fields",
  or "/update-fundraising".
  Accepts a fundraising ID or name (will search if no ID provided).
  Only the fields explicitly provided are changed -- all other fields are left untouched.
version: 1.0.0
model: haiku
---

## Overview

Partially update an existing fundraising. Only fields provided are modified -- this is
a partial update, not a replacement. First resolve the fundraising ID, collect what to
change, then call the update tool.

## Step 1 -- Resolve the fundraising ID

If the user provided a fundraising ID directly, use it and skip to Step 3.

If only a name or keyword was given, search first:

```
mcp__carta__search_fundraising({ query: "<name>", limit: 10 })
```

If multiple fundraisings match, present the list and ask the user to confirm which one
to update (show name and ID for each).

## Step 2 -- Collect what to update

Ask the user what they want to change:
- name -- fundraising round name
- stageId -- move to a different stage (call `get_fundraising_stages` to resolve name -> ID)
- fields -- custom field values keyed by field ID

If the user wants to update custom fields but isn't sure of field IDs, fetch the schema first:

```
mcp__carta__get_fundraising_custom_fields()
```

Important: Only include fields that are explicitly being changed. Omit everything else.

## Step 3 -- Update the fundraising

Call:

```
mcp__carta__update_fundraising({
  id: "<fundraising id>",
  name: "<updated name>",
  stageId: "<stage id>",
  fields: {
    "<field_id>": "<value>"
  }
})
```

Omit any key that is not being updated.

## Step 4 -- Report result

On success, respond with a summary of what changed:
> "Fundraising {name} updated (ID: `{id}`). Changed: [list of changed fields]"

On error, show the error message and suggest:
- Verify the fundraising ID is correct -- run `/search-fundraisings` to find it
- Check that stage IDs are valid -- run `get_fundraising_stages` to list options
- Check that custom field IDs are valid

## Updating multiple fundraisings

If the user wants to apply the same change to multiple fundraisings, repeat Steps 1 and 3-4
for each. Summarize at the end:
> "Updated N fundraisings: [list of names]"
