---
name: hunter-email-finder
description: Finds a professional email address with Hunter from a person's name and company domain. Use when the user explicitly wants Hunter to find a specific person's work email.
user-invocable: true
argument-hint: Jane Smith at stripe.com
---

# Email Finder

Find the most likely email address for a person at a company using their name and domain.

## Examples

- "Jane Smith at stripe.com"
- "the CEO of notion.so"
- `"What's John Doe's email at acme.com?"`
- `"Find the email for Sarah Chen at Figma"`
- `"How can I reach Marc Benioff at Salesforce?"`

## Steps

1. Parse the input. Extract the person's `full_name` and the company `domain`.
   - "Jane Smith at Stripe" -> `full_name`: "Jane Smith", `domain`: "stripe.com"
   - If the user provides a company name instead of a domain, infer the likely domain (e.g., "Stripe" -> "stripe.com")
   - If the domain is inferred rather than provided, confirm it before spending Hunter search credits.
   - If only a role is given (e.g., "the CTO of Notion"), note that Hunter email finding requires a name. Suggest using Hunter domain search on the domain first to find the person's name, then come back to find their email.

2. Use the Hunter email finder MCP action with the person's full name and domain.

3. Present the result:

```
# Email Found: Jane Smith @ Stripe

| Field | Value |
|-------|-------|
| Email | jane.smith@stripe.com |
| Score | 92 |
| Domain | stripe.com |
| Verification | valid |

## Sources
- stripe.com/team (last seen: 2026-02-15)
- LinkedIn profile (last seen: 2026-01-20)

## Next Actions
1. Verify this email address with Hunter email verification
2. Save as a Hunter lead
3. Enrich this contact with Hunter person enrichment
4. Find more contacts at stripe.com with Hunter domain search
```

4. If no email is found, suggest alternatives:
   - "I couldn't find an email for [name] at [domain]. Would you like me to search all contacts at [domain] instead? That might help find the right person."
   - Suggest checking the spelling of the name or trying a different domain variation.

## Credit Cost

Costs 1 search credit - only charged if an email is found.

## Success Criteria

Email address returned with score and at least one source.
