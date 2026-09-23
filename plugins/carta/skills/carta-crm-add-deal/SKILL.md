---
name: carta-crm-add-deal
description: >
  Creates one or more deal records in the Carta CRM via the Carta CRM MCP Server.
  Use this skill when the user says things like "add a deal", "create a deal",
  "log a deal", "add deal to CRM", "add deal to Carta CRM", or "/add-deal".
  Collects deal information conversationally, then creates it via the MCP server.
version: 1.0.0
model: haiku
---

## Overview

Help the user create one or more deal records in the Carta CRM. First fetch available
pipelines and custom fields, then collect deal details conversationally, then call
`create_deal`.

## Step 1 -- Fetch available pipelines and stages

Call the pipelines tool so the user can pick a pipeline and stage by name:

```
mcp__carta__get_deal_pipelines_with_stages()
```

Present the pipeline and stage names to the user. If the call fails, proceed without
it -- pipeline and stage default to the organization's defaults if omitted.

## Step 2 -- Discover available custom fields (optional)

```
mcp__carta__get_deal_custom_fields()
```

Use returned field IDs and labels as hints when collecting deal data.
If the call fails, proceed without it.

## Step 3 -- Collect deal information

Ask the user for:
- Pipeline (optional) -- which pipeline this deal belongs to (from Step 1)
- Stage (optional) -- which stage within the pipeline (from Step 1)
- Company name (optional) -- the company associated with the deal
- Company URL (optional) -- company website (used for auto-enrichment)
- Comment (optional) -- notes or comments about the deal
- Tags (optional) -- array of tag strings
- Deal lead (optional) -- user ID to assign as deal lead
- Added at (optional) -- ISO 8601 date the deal was added
- People (optional) -- contact IDs for advisers, introducers, management
- Custom fields (optional) -- any fields returned in Step 2

If the user has already provided details in their message, extract them directly
without re-asking.

## Step 4 -- Create the deal

Call:

```
mcp__carta__create_deal({
  pipelineId: "<pipeline id>",
  stageId: "<stage id>",
  company: {
    name: "<company name>",
    url: "<company url>"
  },
  comment: "<comment>",
  tags: ["<tag1>", "<tag2>"],
  dealLead: "<user id>",
  addedAt: "<ISO 8601 date>",
  people: {
    advisers: ["<contact id>"],
    introducer: ["<contact id>"],
    management: ["<contact id>"]
  },
  fields: {
    "<field_id>": "<value>"
  }
})
```

Omit any key the user did not provide. Omit `company` if neither name nor URL was given.

## Step 5 -- Report result

On success, respond with:
> "Deal for {company name} created successfully (ID: `{id}`)."

On error, show the error message and suggest:
- Verify pipeline and stage IDs -- run `get_deal_pipelines_with_stages` to list valid options
- Check that custom field IDs are valid

## Adding multiple deals

If the user wants to add multiple deals at once, repeat Steps 3-5 for each one.
After all are done, summarize:
> "Created N deals: [list of company names with IDs]"
