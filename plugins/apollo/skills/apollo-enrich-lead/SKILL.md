---
name: apollo-enrich-lead
description: "Enrich a lead in Apollo from a name, company, email, LinkedIn URL, title, or other identifier, then present a contact card with company context and safe next actions."
---

# Enrich Lead

Turn an identifier into a contact dossier. Use Apollo MCP tools exposed by Cline; tool names below refer to Apollo MCP tool IDs after the `apollo` server is connected.

Before calling a named Apollo MCP tool, inspect the connected MCP server's available tools and schemas. Use the named tool only if it is available; otherwise use the closest supported Apollo MCP workflow or ask the user how to proceed.

## Examples

- "Enrich Tim Zheng at Apollo."
- "Enrich https://www.linkedin.com/in/timzheng."
- "Enrich sarah@stripe.com."
- "Enrich Jane Smith, VP Engineering, Notion."
- "Find and enrich the CEO of Figma."

## Step 1 - Parse Input

From the user's request, extract every identifier available:
- First name, last name
- Company name or domain
- LinkedIn URL
- Email address
- Job title (use as a matching hint)

If the input is ambiguous, for example just "CEO of Figma", first use the Apollo MCP `apollo_mixed_people_api_search` tool with relevant title and domain filters to identify the person. Show likely matches and ask the user to choose before enrichment.

## Step 2 - Enrich the Person

> Credit warning: Tell the user enrichment or reveal actions may consume Apollo credits or reveal allowances. Wait for explicit confirmation before proceeding.

Use the Apollo MCP `apollo_people_match` tool with all available identifiers:
- `first_name`, `last_name` if name is known
- `domain` or `organization_name` if company is known
- `linkedin_url` if LinkedIn is provided
- `email` if email is provided
- Set `reveal_personal_emails` to `true` only when the user explicitly approved personal email reveal; otherwise omit it or set it to `false`

If the match fails, try the Apollo MCP `apollo_mixed_people_api_search` tool with looser filters and present the top 3 candidates. Ask the user to pick one, then re-enrich after confirmation.

## Step 3 - Enrich Their Company

Use the Apollo MCP `apollo_organizations_enrich` tool with the person's company domain to pull firmographic context when it helps the user decide what to do next.

## Step 4 - Present the Contact Card

Format the output exactly like this:

---

[Full Name] | [Title]
[Company Name]  -  [Industry]  -  [Employee Count] employees

| Field | Detail |
|---|---|
| Email (work) | ... |
| Email (personal) | ... (if revealed) |
| Phone (direct) | ... |
| Phone (mobile) | ... |
| Phone (corporate) | ... |
| Location | City, State, Country |
| LinkedIn | URL |
| Company Domain | ... |
| Company Revenue | Range |
| Company Funding | Total raised |
| Company HQ | Location |

---

## Step 5 - Offer Next Actions

Ask the user which action to take:

1. Save to Apollo - After explicit approval, create this person as a contact via `apollo_contacts_create` with `run_dedupe: true`
2. Add to a sequence - Ask which sequence, then run the sequence-load flow
3. Find colleagues - Search for more people at the same company using `apollo_mixed_people_api_search` with `q_organization_domains_list` set to this company
4. Find similar people - Search for people with the same title/seniority at other companies
