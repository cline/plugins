---
name: carta-crm-search-contacts
description: >
  Searches for and retrieves contact (people) records from the Carta CRM.
  Use this skill when the user says things like "find a contact", "search contacts",
  "look up a person", "show me contact details for [name]", "get contact by ID",
  "list contacts", "find people at [company]", "search people", or "/search-contacts".
  Returns contact details including ID, name, email, title, company, and tags.
  The contact ID returned can be used with the update-contact skill.
version: 1.0.0
model: haiku
---

## Overview

Search for contacts in the Carta CRM. If the user provided an ID, fetch the single
record directly. Otherwise search by name/keyword and return results in a readable
summary. Always surface the contact ID so the user can reference it for updates.

## Step 1 -- Determine search mode

- By ID -- user provided a contact ID -> call `fetch_contact_by_id`
- By name / keyword -- user provided a name, email, or keyword -> call `search_contacts`

If it's unclear, default to search and ask the user for a search term.

## Step 2 -- Execute the search

By ID:
```
mcp__carta__fetch_contact_by_id({ id: "<contact id>" })
```

By name / keyword:
```
mcp__carta__search_contacts({
  query: "<search term>",
  limit: 20
})
```

If the user mentions a specific list or folder by name, call `get_contact_lists` first
to resolve the name to a list ID, then pass `list_id` to narrow the search.

Increase `limit` if the user asks to see more results. Use `offset` to paginate.

## Step 3 -- Present results

For each contact returned, display all non-empty fields in a readable summary,
including name, title, company, email, phone, and tags.
Always show the ID prominently -- the user will need it to run `/update-contact`.

`fetch_contact_by_id` also returns related deals and notes -- surface those if the
user is looking for context on a specific person.

If no contacts are found:
> "No contacts found matching your search. Try a different name, email, or keyword."

If multiple results are returned, list them all and note the total count.
