---
name: apollo-sequence-load
description: "Prepare and safely enroll approved Apollo contacts into an outreach sequence, including candidate search, preview, enrichment, dedupe, sender selection, and confirmation."
---

# Sequence Load

Find, enrich, and load contacts into an outreach sequence end to end. Use Apollo MCP tools exposed by Cline; tool names below refer to Apollo MCP tool IDs after the `apollo` server is connected.

Sequence enrollment can trigger outbound messages depending on Apollo sequence and sending-account settings. Always require explicit confirmation before creating contacts or adding anyone to a sequence.

Before calling a named Apollo MCP tool, inspect the connected MCP server's available tools and schemas. Use the named tool only if it is available; otherwise use the closest supported Apollo MCP workflow or ask the user how to proceed.

## Examples

- "Add 20 VP Sales at SaaS companies to my Q1 Outbound sequence."
- "Find SDR managers at fintech startups for Cold Outreach v2."
- "List my Apollo sequences."
- "Add directors of engineering, 500+ employees, US, to Demo Follow-up."
- "Load 15 more approved leads into Enterprise Pipeline."

## Step 1 - Parse Input

From the user's request, extract:

Targeting criteria:
- Job titles -> `person_titles`
- Seniority levels -> `person_seniorities`
- Industry keywords -> `q_organization_keyword_tags`
- Company size -> `organization_num_employees_ranges`
- Locations -> `person_locations` or `organization_locations`

Sequence info:
- Sequence name (text after "to", "into", or "->")
- Volume - how many contacts to add (default: 10 if not specified)

If the user just says "list sequences", skip to Step 2 and show all available sequences.

## Step 2 - Find the Sequence

Use the Apollo MCP `apollo_emailer_campaigns_search` tool to find the target sequence:
- Set `q_name` to the sequence name from input

If no match or multiple matches:
- Show all available sequences in a table: | Name | ID | Status |
- Ask the user to pick one

## Step 3 - Get Email Account

Use the Apollo MCP `apollo_email_accounts_index` tool to list linked email accounts.

- If one account -> use automatically
- If multiple -> show them and ask which to send from

## Step 4 - Find Matching People

Use the Apollo MCP `apollo_mixed_people_api_search` tool with the targeting criteria.
- Set `per_page` to the requested volume (or 10 by default)

Present the candidates in a preview table:

| # | Name | Title | Company | Location |
|---|---|---|---|---|

Ask: "Enrich these [N] candidates and create any missing Apollo contacts for [Sequence Name] from [sender]? This may consume about [N] Apollo credits or reveal allowances. I will ask again before enrolling anyone into the sequence."

Wait for confirmation before proceeding.

## Step 5 - Enrich and Create Contacts

For each approved lead:

1. Enrich - Use the Apollo MCP `apollo_people_bulk_match` tool (batch up to 10 per call) with:
   - `first_name`, `last_name`, `domain` for each person
   - `reveal_personal_emails` set to `true` only when the user explicitly approved personal email reveal; otherwise omit it or set it to `false`

2. Create contacts - For each enriched person, use the Apollo MCP `apollo_contacts_create` tool with:
   - `first_name`, `last_name`, `email`, `title`, `organization_name`
   - `direct_phone` or `mobile_phone` if available
   - `run_dedupe` set to `true`

Collect all created contact IDs.

## Step 6 - Add to Sequence

Before adding contacts to the sequence, show the final enrollable contact table with name, title, company, email, Apollo contact ID, sequence, sender, and count. Ask for final explicit confirmation that these exact contacts should be enrolled. Do not infer this approval from the earlier enrichment/contact-creation confirmation.

Use the Apollo MCP `apollo_emailer_campaigns_add_contact_ids` tool with:
- `id`: the sequence ID
- `emailer_campaign_id`: same sequence ID
- `contact_ids`: array of created contact IDs
- `send_email_from_email_account_id`: the chosen email account ID
- `sequence_active_in_other_campaigns`: `false` (safe default)

## Step 7 - Confirm Enrollment

Show a summary:

---

Sequence loaded successfully

| Field | Value |
|---|---|
| Sequence | [Name] |
| Contacts added | [count] |
| Sending from | [email address] |
| Credits used | [count] |

Contacts enrolled:

| Name | Title | Company | Email |
|---|---|---|---|

---

## Step 8 - Offer Next Actions

Ask the user:

1. Load more - Find and preview another batch of leads
2. Review sequence - Show sequence details and all enrolled contacts
3. Remove a contact - Use `apollo_emailer_campaigns_remove_or_stop_contact_ids` to remove specific contacts
4. Pause a contact - Re-add with `status: "paused"` and an `auto_unpause_at` date
