---
name: lusha-enrich-contact
description: >
  Look up a person and get their verified phone numbers, email, and company context.
  Use when the user says "look up [name]", "get me the contact info for [person]",
  "find [name]'s phone number", "who is [name] at [company]", "enrich [email or name]",
  or any request to retrieve a single person's contact details.
---

# Enrich Contact

Look up a person in Lusha and return a call-ready contact card. Phone numbers -- direct line and mobile -- lead the output.

Cline uses the Lusha MCP server registered by this plugin. Tool names may appear with a `lusha__` prefix in Cline, but the workflow below uses the underlying Lusha tool names for readability.

## Step 1 -- Parse Input

Extract all available identifiers from the user's request. `contacts_search` accepts three lookup paths:
- Email -- standalone, strongest match
- LinkedIn URL -- standalone, strong match
- First name + last name + company name -- all three required together

A job title alone is not a lookup path. If the user gives only a title + company (e.g. "the CFO of Stripe"), there is no name to look up -- first surface candidates with `prospecting_contact_search` (jobTitles + company), then enrich the chosen one. Only ask for clarification when no usable identifier is present at all.

## Step 2 -- Look Up and Reveal

`contacts_search` has an `enrich` flag that controls whether the call reveals (and charges for) phones and email. Pick the path by how confident the match is -- never do both for the same person, that reveals and charges twice.

One-shot (preferred when the identifier is unambiguous -- an email, a LinkedIn URL, or a clean name + company):
Call `contacts_search` with `enrich: true` (the default). The response returns the profile *with* verified phones and email in a single call. You're done -- do not call `prospecting_contact_enrich` afterward.

Preview-then-reveal (when the match may be ambiguous -- common name, no company, multiple likely people):
1. Call `contacts_search` with `enrich: false` -- this returns a preview only and consumes no reveal credits.
2. If multiple candidates come back, present the top 2-3 and ask the user to confirm.
3. State the reveal cost when the preview exposes credits, ask for confirmation, then call `prospecting_contact_enrich` with the chosen result's `id` and `reveal` set from its `canReveal[].field` to reveal phones and email once.

## Step 3 -- Fetch Signals (optional)

If you resolved a Lusha contact `id` in Step 2, use `signals_contacts_get` with that id to check for recent signals (promotion, company change). If you only have an email or LinkedIn URL and no id, use `signals_contacts_search` instead. Signals default to the last 6 months. Include any returned signals in the output as context.

## Step 4 -- Present the Contact Card

Format output as follows. Phone numbers appear first -- never buried.

---

[Full Name] - [Title] - [Company]

 Phone
| Type | Number | Verified |
|------|--------|----------|
| Direct | ... | yes / -- |
| Mobile | ... | yes / -- |

 Email
| Type | Address |
|------|---------|
| Work | ... |

Company
| Field | Value |
|-------|-------|
| Industry | |
| Size | |
| Location | |
| Website | |

Signals *(if returned)*
- [Signal type] -- [date]

---

Omit any section where no data was returned. Never show blank rows.

If no phone numbers are available, state this explicitly: *"No verified phone numbers found for this contact."* Do not present the card as complete when phones are missing.

## Step 5 -- Offer Next Actions

Ask the user which action to take next:

1. Find colleagues -- search for more contacts at the same company
2. Find similar contacts -- build a lookalike list using this person as a seed
3. Signal-prospect from this company -- check if their company is showing buying signals

### If the user selects "Find similar contacts"

The lookalike model requires at least 5 reference contacts or companies to produce quality results. With only 1 contact enriched so far, ask the user how they want to build the reference set before proceeding:

*"To find similar contacts I need at least 5 references for the lookalike model. How would you like to provide them?*
*A) I'll pull colleagues from [Company] -- you pick which ones to include*
*B) I have a specific list of contacts or companies to use as references"*

If the user chooses A:
Use `prospecting_contact_search` scoped to the same company (pass the company via `companyNames` or `companyDomains`) to retrieve colleagues. Present the results and ask the user to select which to include alongside the original contact. Proceed to `lusha-lookalike-prospect` once >=5 are confirmed.

If the user chooses B:
Ask the user to provide their list. Validate that >=5 are supplied before calling `lusha-lookalike-prospect`. If fewer than 5 are provided, state how many more are needed and wait -- do not proceed.

In either case, do not call any lookalike tool until the reference set has been confirmed at >=5.

## Cline Safety Notes

- Use Lusha only for legitimate business prospecting and enrichment workflows.
- Do not reveal the same contact twice; one reveal can consume account credits.
- Ask before revealing contact data when multiple candidates are possible or when any credit cost is shown.
- Do not export, persist, or re-share phone numbers or emails unless the user explicitly asks.
