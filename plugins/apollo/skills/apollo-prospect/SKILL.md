---
name: apollo-prospect
description: "Turn an ideal customer profile into a ranked Apollo prospecting workflow with company search, decision-maker search, enrichment previews, and approved next actions."
---

# Prospect

Go from an ICP description to a ranked, enriched lead list. Use Apollo MCP tools exposed by Cline; tool names below refer to Apollo MCP tool IDs after the `apollo` server is connected.

Before calling a named Apollo MCP tool, inspect the connected MCP server's available tools and schemas. Use the named tool only if it is available; otherwise use the closest supported Apollo MCP workflow or ask the user how to proceed.

## Examples

- "Find VP of Engineering prospects at Series B+ SaaS companies in the US, 200-1000 employees."
- "Find heads of marketing at e-commerce companies in Europe."
- "Find CTOs at fintech startups, 50-500 employees, New York."
- "Find procurement managers at manufacturing companies with 1000+ employees."
- "Find SDR leaders at companies using Salesforce and Outreach."

## Step 1 - Parse the ICP

Extract structured filters from the user's natural language description:

Company filters:
- Industry/vertical keywords -> `q_organization_keyword_tags`
- Employee count ranges -> `organization_num_employees_ranges`
- Company locations -> `organization_locations`
- Specific domains -> `q_organization_domains_list`

Person filters:
- Job titles -> `person_titles`
- Seniority levels -> `person_seniorities`
- Person locations -> `person_locations`

If the ICP is vague, ask 1-2 clarifying questions before proceeding. At minimum, you need a title/role and an industry or company size.

## Step 2 - Search for Companies

Before any live Apollo search, show the search plan, target volume, and whether the planned search or enrichment may consume credits or reveal allowances. If credit impact is unclear, ask the user to approve the live search before proceeding.

Use the Apollo MCP `apollo_mixed_companies_search` tool with the company filters:
- `q_organization_keyword_tags` for industry/vertical
- `organization_num_employees_ranges` for size
- `organization_locations` for geography
- Set `per_page` to 25

## Step 3 - Enrich Top Companies

Show the company search preview first. Before bulk enrichment, tell the user which companies will be enriched and ask for confirmation. Then use the Apollo MCP `apollo_organizations_bulk_enrich` tool with the domains from the approved results. This may reveal revenue, funding, headcount, and firmographic data to help rank companies.

## Step 4 - Find Decision Makers

Use the Apollo MCP `apollo_mixed_people_api_search` tool with:
- `person_titles` and `person_seniorities` from the ICP
- `q_organization_domains_list` scoped to the enriched company domains
- `per_page` set to 25

## Step 5 - Enrich Top Leads

> Credit warning: Tell the user exactly how many leads will be enriched and that Apollo credits or reveal allowances may be consumed. Wait for explicit confirmation before proceeding.

Use the Apollo MCP `apollo_people_bulk_match` tool to enrich up to 10 leads per call with:
- `first_name`, `last_name`, `domain` for each person
- `reveal_personal_emails` set to `true` only when the user explicitly approved personal email reveal; otherwise omit it or set it to `false`

If more than 10 leads, batch into multiple calls.

## Step 6 - Present the Lead Table

Show results in a ranked table:

### Leads matching: [ICP Summary]

| # | Name | Title | Company | Employees | Revenue | Email | Phone | ICP Fit |
|---|---|---|---|---|---|---|---|---|

ICP Fit scoring:
- Strong - title, seniority, company size, and industry all match
- Good - 3 of 4 criteria match
- Partial - 2 of 4 criteria match

Summary: Found X leads across Y companies. Z credits consumed.

## Step 7 - Offer Next Actions

Ask the user:

1. Save all to Apollo - After explicit approval, bulk-create contacts via `apollo_contacts_create` with `run_dedupe: true` for each lead
2. Load into a sequence - Ask which sequence and run the `apollo-sequence-load` flow for these contacts
3. Deep-dive a company - Enrich or research one company from the list
4. Refine the search - Adjust filters and re-run
5. Export - Only after explicit approval, format leads as a CSV-style table for copy-paste
