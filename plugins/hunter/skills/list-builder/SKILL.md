---
name: hunter-list-builder
description: Creates and populates a Hunter leads list from contacts or domains. Use when the user explicitly wants to save contacts into Hunter leads, organize Hunter search results, or build a Hunter prospect list.
user-invocable: true
argument-hint: Create a list of marketing leads from SaaS companies
---

# List Builder

Create a Hunter leads list and populate it with contacts from search results, enrichment, or manual input.

## Examples

- "Create a list of marketing leads from SaaS companies"
- `"Save these contacts to a new list called Q2 Outreach"`
- `"Build a list from the domain search results"`
- `"Organize my prospects into a leads list"`

## Workflow

### Step 1: Determine the Source

Parse the user's request to identify where leads come from:

- From a previous search - use contacts already found via Hunter domain search or company discovery.
- From specific emails/contacts - the user provides email addresses directly.
- From a new search - run Hunter company discovery and domain search first, then save results.

### Step 2: Create the List

Before creating or updating Hunter leads, summarize the list name, source, expected lead count, and any credit-consuming searches used to gather the contacts. Ask the user to confirm.

Use the Hunter create leads list MCP action with a descriptive name only after confirmation. If the user doesn't provide a name, suggest one based on the context (e.g., "Fintech CTOs - France - 2026-04-08").

Present the deep-link: "List created: https://hunter.io/leads?leads_list_id={id}"

### Step 3: Add Leads

For each contact, use the Hunter upsert lead MCP action with the contact's data and the new leads list ID. Prefer upsert behavior to avoid duplicates.

Include all available fields: `email`, `first_name`, `last_name`, `position`, `company`, `linkedin_url`, etc.

Report progress: "Adding lead 5 of 20..."

### Step 4: Present Summary

```
# List Created: [List Name]

Leads added: [count] | Duplicates skipped: [count]

View in Hunter: https://hunter.io/leads?leads_list_id={id}

## Next Steps
1. Add more leads to this list
2. Add leads to a Hunter campaign
3. Merge with another Hunter leads list
4. Search for more contacts with Hunter domain search or company discovery
```

## Credit Cost

Free - Hunter list creation and lead upsert actions do not consume credits. Only the initial Hunter search uses credits if leads come from a new search.

## Important Notes

- Use Hunter upsert behavior to avoid creating duplicate leads
- Use Hunter lead existence checks before adding if unsure
- Max 100 leads per page when listing - use offset to paginate
- Lists can be merged later with Hunter list merge actions
