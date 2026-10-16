---
name: carta-crm-update-contact
description: >
  Updates an existing contact (person) record in the Carta CRM.
  Use this skill when the user says things like "update a contact", "edit contact",
  "update contact details", "change contact email", "update person's title",
  "update contact company", "add a tag to contact", or "/update-contact".
  Accepts a contact ID or name (will search if no ID provided).
  Only the fields explicitly provided are changed -- all other fields are left untouched.
version: 1.0.0
model: haiku
---

## Overview

Partially update an existing contact. Only fields provided are modified -- this is
a partial update, not a replacement. First resolve the contact ID, collect what to
change, then call the update tool.

## Step 1 -- Resolve the contact ID

If the user provided a contact ID directly, use it and skip to Step 3.

If only a name or description was given, search first:

```
mcp__carta__search_contacts({ query: "<name>", limit: 10 })
```

If multiple contacts match, present the list and ask the user to confirm which one
to update (show name, title, company, and ID for each).

## Step 2 -- Collect what to update

Ask the user what they want to change. Updatable fields include:

| Field | Description |
|-------|-------------|
| `name` | Full name |
| `firstName`, `lastName`, `middleName` | Name parts |
| `emailDetail` | Primary email; Second/Third/Fourth for additional emails |
| `phone` | Primary phone; `businessPhone` for business number |
| `title` | Job title |
| `headline` | Short bio or tagline |
| `location` | Work location (city, state, country) |
| `homeLocation` | Home location (city, state, country) |
| `socialLinks` | linkedinUrl, twitterUrl, githubUrl, facebookUrl |
| `jobs` | Work experience array -- fully replaces existing jobs |
| `tags` | Tags array -- fully replaces existing tags |
| `notes` | Free-text notes |
| `fields` | Custom field values keyed by field ID |

If the user wants to update custom fields but isn't sure of field IDs, fetch the schema first:
```
mcp__carta__get_contact_custom_fields()
```

Important: Only include fields that are explicitly being changed. Omit everything else.

## Step 3 -- Update the contact

Call:

```
mcp__carta__update_contact({
  id: "<contact id>",
  name: "<updated name>",
  title: "<updated title>",
  emailDetail: "<updated email>",
  tags: ["<tag1>", "<tag2>"],
  fields: { "<field_id>": "<value>" }
})
```

Omit any key that is not being updated.

## Step 4 -- Report result

On success, respond with a summary of what changed:
> "Contact {name} updated (ID: `{id}`). Changed: [list of changed fields]"

On error, show the error message and suggest:
- Verify the contact ID is correct -- run `/search-contacts` to find it
- Check that custom field IDs are valid

## Updating multiple contacts

If the user wants to apply the same change to multiple contacts, repeat Steps 1 and 3-4
for each. Summarize at the end:
> "Updated N contacts: [list of names]"
