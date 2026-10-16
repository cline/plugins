---
name: carta-crm-update-deal
description: >
  Updates an existing deal record in the Carta CRM.
  Use this skill when the user says things like "update a deal", "move deal to [stage]",
  "change deal stage", "edit deal", "update deal fields", "add a tag to deal",
  "assign deal lead", "update company info on deal", "link contacts to deal",
  or "/update-deal".
  Accepts a deal ID or company name (will search if no ID provided).
  Only the fields explicitly provided are changed -- all other fields are left untouched.
version: 1.0.0
model: haiku
---

## Overview

Partially update an existing deal. Only fields provided are modified -- this is
a partial update, not a replacement. First resolve the deal ID, collect what to
change, then call the update tool.

## Step 1 -- Resolve the deal ID

If the user provided a deal ID directly, use it and skip to Step 3.

If only a company name was given, call `get_deal_fields` first, then search:

```
mcp__carta__get_deal_fields()
mcp__carta__search_deals({ query: "<company name>", limit: 10 })
```

If multiple deals match, present the list and ask the user to confirm which one
to update (show company name, stage, and ID for each).

## Step 2 -- Collect what to update

Ask the user what they want to change:

| Field | Description |
|-------|-------------|
| `stageId` | Move deal to a different stage |
| `company.name` | Update the associated company name |
| `company.url` | Update company URL -- triggers auto-enrichment |
| `comment` | Replace the deal comment/notes |
| `tags` | Replace the full tags array |
| `dealLead` | User ID to assign as deal lead |
| `addedAt` | ISO 8601 date the deal was added |
| `fields` | Custom field values keyed by field ID |
| `people.advisers` | Contact IDs linked as advisers |
| `people.introducer` | Contact IDs linked as introducers |
| `people.management` | Contact IDs linked as management |

If the user wants to move to a stage by name, fetch pipelines first:
```
mcp__carta__get_deal_pipelines_with_stages()
```

If updating custom fields by label rather than ID:
```
mcp__carta__get_deal_custom_fields()
```

Important: Only include fields that are explicitly being changed. Omit everything else.

## Step 3 -- Update the deal

Call:

```
mcp__carta__update_deal({
  id: "<deal id>",
  stageId: "<stage id>",
  company: { name: "<name>", url: "<url>" },
  comment: "<updated comment>",
  tags: ["<tag1>", "<tag2>"],
  dealLead: "<user id>",
  addedAt: "<ISO 8601 date>",
  fields: { "<field_id>": "<value>" },
  people: {
    advisers: ["<contact id>"],
    introducer: ["<contact id>"],
    management: ["<contact id>"]
  }
})
```

Omit any top-level key that is not being updated.

## Step 4 -- Report result

On success, respond with a summary of what changed:
> "Deal for {company name} updated (ID: `{id}`). Changed: [list of changed fields]"

On error, show the error message and suggest:
- Verify the deal ID is correct -- run `/search-deals` to find it
- Check that stage IDs are valid -- run `get_deal_pipelines_with_stages`
- Check that custom field IDs and contact IDs are valid

## Updating multiple deals

If the user wants to apply the same change to multiple deals, repeat Steps 1 and 3-4
for each. Summarize at the end:
> "Updated N deals: [list of company names]"
