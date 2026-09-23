---
name: carta-crm-search-companies
description: >
  Searches for and retrieves company records from the Carta CRM.
  Use this skill when the user says things like "find a company", "search companies",
  "look up a company", "show me company details for [name]", "get company by ID",
  "get company by domain", "list companies", "what companies do we have", or "/search-companies".
  Returns company details including ID, name, and custom fields.
  The company ID returned can be used with the update-company skill.
version: 1.0.0
model: haiku
---

## Overview

Search for companies in the Carta CRM. Choose the right tool based on what the user
provided. Always surface the company ID so the user can reference it for updates.

## Step 1 -- Determine search mode

- By domain -- user provided a website domain (e.g. "stripe.com") -> use `fetch_company_by_domain`
- By name / keyword -- user provided a company name or keyword -> use `search_companies`

If it's unclear, default to search by name and ask for a search term.

## Step 2 -- Execute the search

By domain:
```
mcp__carta__fetch_company_by_domain({ domain: "<domain>" })
```

By name / keyword:
```
mcp__carta__search_companies({
  query: "<search term>",
  limit: 20
})
```

Increase `limit` if the user asks to see more results. Use `offset` to paginate.

## Step 3 -- Present results

For each company returned, display all non-empty fields in a readable summary.
Always show the ID prominently -- the user will need it to run `/update-company`.

If no companies are found:
> "No companies found matching your search. Try a different name, keyword, or domain."

If multiple results are returned, list them all and note the total count.
