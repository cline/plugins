---
name: hunter-email-verifier
description: Verifies whether an email address is deliverable using Hunter. Use when the user explicitly wants Hunter email verification or asks to assess deliverability before sending.
user-invocable: true
argument-hint: jane@stripe.com
---

# Email Verifier

Check whether an email address is deliverable before you send to it.

## Examples

- "jane@stripe.com"
- `"Is john@acme.com a valid email?"`
- `"Check if sarah@notion.so is deliverable"`
- `"Verify these emails: a@x.com, b@y.com, c@z.com"`
- `"Can I send to hello@example.com?"`

## Steps

1. Parse the input. Extract the `email` address(es).

2. Use the Hunter email verifier MCP action for each email.

3. Present the result with an actionable recommendation:

```
# Verification: jane@stripe.com

| Check | Result |
|-------|--------|
| Status | valid |
| Score | 91 |
| MX Records | Valid |
| SMTP Check | Valid |
| Accept All | No |
| Disposable | No |

## Recommendation
Safe to send. This email address is deliverable with high confidence.

## Next Actions
1. Find more contacts at stripe.com
2. Enrich this contact with personal details
```

4. Interpret the result clearly based on the `status` field:
   - `valid` (score 80+) -> "Safe to send. This email address is deliverable with high confidence."
   - `accept_all` -> "Proceed with caution. This mail server accepts all addresses, so delivery is not guaranteed even though SMTP checks pass."
   - `unknown` -> "Unable to determine deliverability. The mail server didn't respond clearly -- consider sending a low-priority test first."
   - `invalid` (score below 50) -> "Do not send. This address is likely invalid and will bounce."
   - Disposable email (`disposable: true`) -> Add: "This is a disposable/temporary email address. It may stop working at any time."
   - Pending (HTTP 202 response) -> "Verification is still in progress. Try again in a few seconds."

5. For multiple emails, verify each separately and present a summary:

```
# Verification Summary

| Email | Status | Score | Recommendation |
|-------|--------|-------|----------------|
| jane@stripe.com | valid | 91 | Safe to send |
| john@acme.com | accept_all | 62 | Proceed with caution |
| test@fake.com | invalid | 12 | Do not send |

Results: 1 valid, 1 accept_all, 1 invalid
```

## Credit Cost

Costs 1 verification credit per email - only charged for valid, invalid, or accept_all results.

## Success Criteria

Verification status returned with a clear, actionable recommendation the user can act on immediately.
