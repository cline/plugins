---
name: hunter-person-enrichment
description: Retrieves Hunter person information from an email address, including name, position, company, and social profiles. Use when the user explicitly wants Hunter person enrichment.
user-invocable: true
argument-hint: jane@stripe.com
---

# Person Enrichment

Get a detailed profile of a person from their email address.

## Examples

- "jane@stripe.com"
- `"What do you know about john@acme.com?"`
- `"Who is sarah@notion.so?"`
- `"Enrich this contact: marc@salesforce.com"`
- `"Get me details on hello@figma.com"`

## Steps

1. Parse the input. Extract the `email` address.

2. Use the Hunter person enrichment MCP action with the email.

3. Present the person profile:

```
# Person: Jane Smith (jane@stripe.com)

| Field | Value |
|-------|-------|
| Name | Jane Smith |
| Position | VP of Engineering |
| Company | Stripe |
| Location | San Francisco, CA |
| LinkedIn | linkedin.com/in/janesmith |
| Twitter | @janesmith |

## Next Actions
1. Verify this email address with Hunter email verification
2. Save as a Hunter lead
3. Find more contacts at stripe.com with Hunter domain search
4. Enrich Stripe with Hunter company enrichment
```

4. If no data is found, respond: "No data available for [email]. Try enriching their company domain instead, or use Hunter domain search to find other contacts at this company."

## Credit Cost

Costs 1 enrichment credit - only charged if data is found.

## Success Criteria

Person's name and position returned from the email address.
