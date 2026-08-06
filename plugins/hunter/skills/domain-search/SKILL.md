---
name: hunter-domain-search
description: Finds Hunter contacts and publicly available email addresses at a company domain. Use when the user explicitly wants Hunter domain search, contacts at a domain, or professional emails for an organization.
user-invocable: true
argument-hint: stripe.com
---

# Domain Search

Find all contacts and email addresses associated with a company domain.

## Examples

- "stripe.com"
- "Notion"
- `"Who works at figma.com?"`
- `"Find me contacts at Salesforce"`
- `"Show me the marketing team at hubspot.com"`
- `"List executives at acme.com"`

## Steps

1. Parse the input. Extract the `domain`.
   - "stripe.com" -> use directly
   - "Stripe" or "stripe" -> infer domain as "stripe.com"
   - If unsure about the domain, ask the user to confirm.
   - If the domain is inferred rather than provided, confirm it before spending Hunter search credits.

2. Use the Hunter domain search MCP action with the domain. Use server-side filters when the user specifies criteria:
   - `type`: `personal` or `generic`
   - `seniority`: comma-separated from `junior`, `senior`, `executive`
   - `department`: comma-separated from `executive`, `it`, `finance`, `management`, `sales`, `legal`, `support`, `hr`, `marketing`, `communication`, `education`, `design`, `health`, `operations`
   - `required_field`: `full_name`, `position`, or `phone_number` - only return results where this field has a value
   - `limit`: 1-100 (default 10)
   - `offset`: for pagination

   Mapping user requests to filters:
   - "marketing team" -> `department: "marketing"`
   - "executives" / "C-suite" / "leadership" -> `seniority: "executive"`
   - "engineering" / "developers" -> `department: "it"`
   - "senior people" -> `seniority: "senior,executive"`
   - No filter specified -> show the top contacts by confidence score

3. Present the results:

```
# Contacts at Stripe (stripe.com)

Found: 247 contacts | Showing: 10

| Name | Position | Email | Confidence |
|------|----------|-------|------------|
| Patrick Collison | CEO | patrick@stripe.com | 97% |
| John Collison | President | john@stripe.com | 95% |
| David Singleton | CTO | david.singleton@stripe.com | 88% |
| ... | ... | ... | ... |

## Next Actions
1. Show more contacts (use offset to paginate)
2. Filter by department (e.g., "show me the marketing team")
3. Verify email addresses (1 verification credit each)
4. Save contacts as Hunter leads
5. Enrich Stripe with Hunter company enrichment
```

5. If the user asks for more, present the next batch of results.

6. If zero results, suggest:
   - Check the domain spelling
   - The company may be too new or too small for our database
   - Try Hunter company discovery to find similar companies

## Credit Cost

Costs 1 search credit per 10 emails returned (rounded up) - only charged if emails are found.

## Success Criteria

At least one contact returned with name, email, and confidence score.
