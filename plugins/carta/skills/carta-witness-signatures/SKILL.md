---
name: carta-witness-signatures
description: Status of witness and spousal-consent signature requests on option grants, RSAs, PIUs -- who still needs to sign, and what's awaiting signature, signed, or expired. Covers one award, one company, or a whole portfolio. Read-only.
when_to_use: >-
  Use when asked whether a witness or a spouse has signed, who still
  needs to sign an award, which signature requests are awaiting
  signature or have expired, when a signing link expires, or to list
  witness / spousal-consent requests for a single award, a company, or
  across a portfolio. Phrasings like "did the witness sign", "is the
  spousal consent done", "which grants are waiting on a signature", or
  "any expired signing links".
model: inherit
---

# Witness & Spousal-Consent Signatures

Show the status of the extra signatures some equity awards need before they're fully in place.

## Background

When someone is granted equity, the award sometimes needs a signature from a person other than the recipient before it's complete:

- Witness -- an independent person who confirms they watched the recipient sign. This is a legal requirement in some markets.
- Spousal consent -- the recipient's spouse signs to acknowledge the award. This applies where local marital-property rules give a spouse an interest in equity earned during the marriage.

Each one is tracked as a signature request tied to a single award. A request moves through these stages:

| Stage | What it means |
|-------|---------------|
| Awaiting details | The request exists, but the witness or spouse's name and email haven't been added yet. |
| Awaiting signature | Details are in and the signing link has been sent. Waiting on the witness or spouse to sign. |
| Signed | Done -- the witness or spouse has signed. |
| Expired | The signing link's deadline passed before it was signed. Signing links expire about 30 days after they're sent. |

These three awards can carry signature requests: option grants, RSAS (restricted stock awards), and PIUs (profits interest units).

## When to Use

- "Did the witness sign Jordan's option grant?"
- "Which grants are still waiting on a signature?"
- "Is the spousal consent done for this award?"
- "Show me any expired signing links for this company."
- "List the outstanding witness signatures across my portfolio."


## Prerequisites

- One company or one award -> you need the company. Get it from `list_accounts` (companies appear as `corporation_pk:` entries).
- A single award -> you also need its type (`OPTION_GRANT`, `RSA`, or `PIU`) and the award itself. The company-wide list (below) returns these, so start there if you don't already know which award you mean.
- A portfolio -> you need the portfolio. Get it from `list_accounts` (portfolios appear as `organization_pk:` entries) -- this is the investor or firm view across the companies they hold or manage.

If a required input is missing, ask for it with `ask the user` before fetching (see carta-interaction-reference §4.1).

## Data Retrieval

Pick the command that matches the scope of the question.

One company -- every request for a single company:

```
call_tool({"name": "cap_table__list__witness_signatures_for_corporation", "arguments": {"corporation_id": corporation_id}})
```

Optional filters: `request_type` (`WITNESS` or `SPOUSAL_CONSENT`), `status` (a list of `PENDING`, `FILLED`, `SIGNED`, `EXPIRED`), `page`, `page_size`.

One award -- every request on a single award you've already identified:

```
call_tool({"name": "cap_table__get__witness_signatures_for_security", "arguments": {"corporation_id": corporation_id, "security_type": "OPTION_GRANT", "security_id": security_id}})
```

`security_type` is one of `OPTION_GRANT`, `RSA`, `PIU`.

A portfolio -- requests across every company in a portfolio:

```
call_tool({"name": "cap_table__list__witness_signatures_for_portfolio", "arguments": {"portfolio_id": portfolio_id}})
```

Optional filters: `request_type`, `status`, `issuer_id` (narrow to one company), `page`, `page_size`.

> Spousal consent in portfolio view: the portfolio list returns witness requests only, unless you narrow it to a single company with `issuer_id`. Spousal-consent requests appear only for a single company that has the feature turned on. If a user asks about spousal consent across a whole portfolio, narrow to one company at a time.

> Default status filter: when you don't pass `status`, the results show the requests that usually need attention -- those awaiting signature and those that have expired. To see requests still awaiting details or already signed, pass `status` explicitly (e.g. `"status": ["SIGNED"]`).

## Key Fields

Each request carries:

- `status`: `PENDING`, `FILLED`, `SIGNED`, or `EXPIRED` -- map to the friendly labels in the Background table.
- `request_type`: `WITNESS` or `SPOUSAL_CONSENT`.
- `expires_at`: the signing deadline.
- `issuer_name`: the company that granted the award.
- `security_label`: the award's reference (for example, "ES-1007").
- `security_type`: `OPTION_GRANT`, `RSA`, or `PIU`.
- `witness_name`, `witness_email`: the witness or spouse who needs to sign (blank until details are added).
- `acceptance_date`: when the recipient accepted the award.

## Gates

Required inputs: a company (`corporation_id`) for the company and award commands; a portfolio (`portfolio_id`) for the portfolio command; plus `security_type` and the award for the single-award command. If missing, call `ask the user` before proceeding.

## Presentation

Format: Table.

BLUF lead: Lead with the counts -- how many are awaiting signature, signed, and expired -- then the table.

> 4 signature requests: 2 awaiting signature, 1 signed, 1 expired.

Translate codes to plain language. Never show the raw status, type, or any internal reference. Use "Awaiting signature", "Witness" / "Spousal consent", and "Option grant" / "RSA" / "PIU". Identify each request by company, award reference, and the person's name -- not by any internal number.

Sort order: Awaiting signature first, then by soonest deadline; expired next; signed last.

Date format: MMM d, yyyy (e.g. "Jan 15, 2026").

| Company | Award | Type | Needs to sign | Status | Deadline |
|---------|-------|------|---------------|--------|----------|
| Acme | ES-1007 (Option grant) | Witness | Dana Lee | Awaiting signature | Jun 1, 2026 |
| Acme | PIU-12 (Profits interest unit) | Spousal consent | Sam Rivera | Signed | -- |

For a single award, lead with the award and the count, then list its requests.

End with a next step -- for example, point out which requests are closest to expiring, or note that reminders and deadline extensions are handled in Carta.

## Caveats

- Read-only: this skill can't add details, send reminders, or extend deadlines -- those are done in Carta.
