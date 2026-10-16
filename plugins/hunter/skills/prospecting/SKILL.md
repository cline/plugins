---
name: hunter-prospecting
description: Runs end-to-end B2B prospecting with Hunter by chaining company discovery, contact search, email verification, and enrichment. Use when the user explicitly wants Hunter-powered prospecting, lead discovery, or contact qualification.
user-invocable: true
argument-hint: Find CTOs at fintech startups in Europe
---

# Prospecting

Chain Hunter MCP actions into a complete prospecting workflow. Discover companies, find contacts, verify emails, and enrich -- all in one go.

## Examples

- "Find CTOs at fintech startups in France"
- "decision-makers at Stripe, Notion, and Figma"
- `"Build me a list of marketing leads at SaaS companies in Germany"`
- `"I need 20 VPs of Sales at mid-size tech companies"`
- `"Find people to reach out to at companies using Salesforce in healthcare"`

## Workflow

### Step 1: Identify Companies

Parse the user's request to determine the starting point:

- Specific companies provided (e.g., "Stripe, Notion, Figma") -- skip to Step 2.
- Criteria provided (e.g., "fintech startups in France") -- use the Hunter company discovery MCP action with the criteria as the query.

If Hunter discovery returns more than 10 companies, present the full list and ask:

> "I found [N] companies matching your criteria. Here are the top results. Which ones should I search for contacts? You can select specific companies or say 'proceed with all' (note: each Domain Search uses 1 credit per 10 results returned)."

### Step 2: Find Contacts

For each company, use the Hunter domain search MCP action with the company's domain. If a domain was inferred rather than returned by Hunter discovery or provided by the user, confirm it before spending search credits. Use server-side filters:
- "CTOs" or "engineering leaders" -> `department: "it"`, `seniority: "executive"`
- "marketing team" -> `department: "marketing"`
- "executives" or "C-suite" -> `seniority: "executive"`
- "senior people" -> `seniority: "senior,executive"`

Report progress for multi-company searches: "Searching stripe.com... found 15 contacts. Moving to notion.so..."

### Step 3: Verify Emails (Optional)

> Before verifying, confirm credit usage: "I found [N] contacts across [M] companies. Verifying all emails will use [N] verification credits. Proceed?"

Only verify after the user confirms. Use the Hunter email verification MCP action for each contact's email.

If the user says "skip verification," present unverified results instead.

### Step 4: Enrich (Optional)

If the user asks for more company context, use the Hunter company enrichment MCP action for each company's domain. Only run this step if requested -- do not run by default.

### Step 5: Save to Hunter Leads

After presenting results, offer to save contacts:

> "Would you like me to save these contacts to your Hunter leads? I can create a new list for them."

If the user confirms:
1. Use the Hunter create leads list MCP action with a descriptive name (e.g., "Fintech CTOs - France - 2026-04-08").
2. For each contact, use the Hunter upsert lead MCP action with the contact's data and the new leads list ID.
3. Present the deep-link: "View your leads list: https://hunter.io/leads?leads_list_id={id}"

### Step 6: Present Results

Present a consolidated table grouped by company:

```
# Prospect List: [Description]

Companies: [count] | Contacts: [count] | Verified: [deliverable] deliverable, [risky] risky

## [Company Name] (domain.com)
Industry | Size | Location

| Name | Position | Email | Verified |
|------|----------|-------|----------|
| ... | ... | ... | valid / accept_all / invalid / unknown |

## Next Steps
1. Save contacts to a Hunter leads list
2. Add contacts to a Hunter campaign
3. Verify the risky addresses again later
4. Search for more companies with different criteria
```

## Credit Costs

- Hunter company discovery - Free (no credits)
- Hunter domain search - 1 search credit per 10 emails returned (rounded up)
- Hunter email verification - 1 verification credit per email
- Hunter company enrichment - 1 enrichment credit per domain
- Hunter lead/list/company save actions - Free (no credits)

## Important Notes

- Always confirm before running verification on large batches
- If a company returns zero contacts, skip it and note it in the output
- If the user interrupts mid-workflow, present partial results gathered so far
- Prefer Hunter upsert lead behavior over creating duplicate leads
