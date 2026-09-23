---
name: carta-crm-add-fundraising
description: >
  Adds one or more fundraising records to the Carta CRM via the Carta CRM MCP Server.
  Use this skill when the user says things like "add a fundraising", "create a fundraising",
  "log a fundraising round", "add fundraising to CRM", "create fundraising record",
  or "/add-fundraising". Collects fundraising information conversationally, then creates
  it via the MCP server.
version: 1.0.0
model: haiku
---

## Overview

Help the user create one or more fundraising records in the Carta CRM using the
`create_fundraising` MCP tool. Collect details conversationally, then call the tool.

## Step 1 -- Fetch available stages (optional but recommended)

Call the stages tool so the user can pick a stage by name:

```
mcp__carta__get_fundraising_stages()
```

Present the stage names to the user. If the call fails, proceed without it --
stage defaults to the first stage if omitted.

## Step 2 -- Discover available custom fields (optional)

```
mcp__carta__get_fundraising_custom_fields()
```

Use returned field IDs and labels as hints when collecting fundraising data.
If the call fails, proceed without it.

## Step 3 -- Collect fundraising information

Ask the user for:
- Name (required) -- the fundraising round name (e.g. "Acme Corp Series B", "Project Atlas Seed Round")
- Stage (optional) -- which stage this fundraising is in (from Step 1)
- Custom fields (optional) -- any fields returned in Step 2

If the user has already provided details in their message, extract them directly
without re-asking.

## Step 4 -- Create the fundraising

Call:

```
mcp__carta__create_fundraising({
  name: "<fundraising name>",
  stageId: "<stage id>",
  fields: {
    "<field_id>": "<value>"
  }
})
```

Omit `stageId` and `fields` if not provided.

## Step 5 -- Report result

On success, respond with:
> "Fundraising {name} created successfully (ID: `{id}`)."

On error, show the error message and suggest:
- Check that `name` is provided and non-empty
- Verify stage IDs are valid -- run `get_fundraising_stages` to list options
- Verify custom field IDs match the keys returned by `get_fundraising_custom_fields`

## Adding multiple fundraisings

If the user wants to add multiple fundraisings at once, repeat Steps 3-5 for each one.
After all are done, summarize:
> "Created N fundraisings: [list of names with IDs]"
