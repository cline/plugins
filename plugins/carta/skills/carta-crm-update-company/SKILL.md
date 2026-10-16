---
name: carta-crm-update-company
description: >
  Updates an existing company record in the Carta CRM.
  Use this skill when the user says things like "update a company", "edit company",
  "update company details", "change company name", "update company website",
  "update company fields", "add a tag to company", or "/update-company".
  Accepts a company ID or name (will search if no ID provided).
  Only the fields explicitly provided are changed -- all other fields are left untouched.
version: 1.0.0
model: haiku
---

## Overview

Partially update an existing company. Only fields provided are modified -- this is
a partial update, not a replacement. First resolve the company ID, collect what to
change, then call the update tool.

## Step 1 -- Resolve the company ID

If the user provided a company ID directly, use it and skip to Step 3.

If a domain was given, look it up first:
```
mcp__carta__fetch_company_by_domain({ domain: "<domain>" })
```

If a name or keyword was given, search first:
```
mcp__carta__search_companies({ query: "<name>", limit: 10 })
```

If multiple companies match, present the list and ask the user to confirm which one
to update (show name and ID for each).

## Step 2 -- Collect what to update

Ask the user what they want to change:
- name -- company name
- image -- company logo URL
- fields -- custom field values keyed by field ID (e.g. website, location, industry, about, tags)

If the user wants to update custom fields but isn't sure of field IDs, fetch the schema first:

```
mcp__carta__get_company_custom_fields()
```

If the user has already specified what to change in their message, extract it directly
without re-asking.

Important: Only include fields that are explicitly being changed. Omit everything else.

## Step 3 -- Update the company

Call:

```
mcp__carta__update_company({
  id: "<company id>",
  name: "<updated name>",
  image: "<logo url>",
  fields: {
    "<field_id>": "<value>"
  }
})
```

Omit any top-level key that is not being updated.

## Step 4 -- Report result

On success, respond with a summary of what changed:
> "Company {name} updated (ID: `{id}`). Changed: [list of changed fields]"

On error, show the error message and suggest:
- Verify the company ID is correct -- run `/search-companies` to find it
- Check that custom field IDs are valid

## Updating multiple companies

If the user wants to apply the same change to multiple companies, repeat Steps 1 and 3-4
for each. Summarize at the end:
> "Updated N companies: [list of names]"
