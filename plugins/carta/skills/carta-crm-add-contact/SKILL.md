---
name: carta-crm-add-contact
description: >
  Adds one or more contact records to the Carta CRM via the Carta CRM MCP Server.
  Use this skill when the user says things like "add a contact", "create a contact
  record", "add contact to CRM", "save a contact", "upload contact to Carta CRM",
  or "/add-contact". Collects contact information conversationally, then creates it
  via the MCP server. Only name is required -- all other fields are optional.
version: 1.0.0
model: haiku
---

## Overview

Help the user create one or more contact records in the Carta CRM using the
`create_contact` MCP tool. Only `name` is required -- collect that and any other
details the user has already provided, then call the tool. Do not block on optional fields.

## Step 1 -- Collect contact information

Only `name` is required. Extract everything the user has already provided in their
message without re-asking. If `name` is missing, ask for it once.

Fields you can collect:
- name (required) -- full name, or derived from firstName + lastName
- firstName, lastName, middleName (optional)
- emailDetail -- primary email; emailDetailSecond/Third/Fourth for additional emails
- phone -- primary phone; businessPhone/thirdPhone/fourthPhone for additional numbers
- title -- job title
- headline -- short bio or tagline
- location -- work location: city, state, country
- socialLinks -- linkedinUrl, twitterUrl, githubUrl, facebookUrl
- jobs -- work experience: array of {companyName, title, startedOn, endedOn}
- tags -- array of string tags
- notes -- free-text notes
- listId -- if provided, adds the contact to that list

If the user wants to populate custom fields, fetch the schema first:
```
mcp__carta__get_contact_custom_fields()
```

Never ask for `listId` unless the user brings it up.

## Step 2 -- Create the contact

Call:

```
mcp__carta__create_contact({
  name: "<contact name>",
  firstName: "<first>",
  lastName: "<last>",
  emailDetail: "<email>",
  phone: "<phone>",
  title: "<title>",
  tags: ["<tag1>"],
  fields: { "<field_id>": "<value>" }
})
```

Include only the fields the user provided. Omit everything else.

## Step 3 -- Report result

On success, respond with:
> "Contact {name} saved successfully (ID: `{id}`)."

On error, show the error message and suggest:
- Check that `name` is provided and non-empty
- Verify the `listId` exists if one was provided

## Adding multiple contacts

If the user wants to add multiple contacts, repeat Steps 1-3 for each one, then
summarize:
> "Created N contacts: [list of names with IDs]"
