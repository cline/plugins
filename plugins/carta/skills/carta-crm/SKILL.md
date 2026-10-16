---
name: carta-crm
user-invocable: false
description: Router for Carta CRM workflows. Use only to choose a detailed Carta CRM search, add, update, enrichment, portfolio lookup, note, deal, investor, company, contact, or fundraising skill.
---

# Carta CRM

Use this skill for Carta CRM records and fundraising pipeline workflows.

## Read Workflows

- search investors, companies, contacts, deals, notes, and fundraisings
- look up a company's investors, contacts, or related deals
- review fundraising pipeline by stage
- find recent notes or activity for a deal
- look up a fund portfolio after resolving an authenticated Carta context with permission to view it

Read operations can still expose confidential relationship data. Keep outputs scoped to the user's question.

## Write Workflows

Ask for confirmation before create or update operations:

- add or update an investor
- add or update a company
- add or update a contact
- create or move a deal
- add or edit a note
- create or update a fundraising record
- enrich a company or record with external information

Before writing, summarize the exact fields that will change. After writing, confirm the record and key fields changed.

## Data Quality

When adding or updating records:

- ask for missing required fields
- avoid duplicate records by searching first
- preserve user-provided names, websites, emails, and stages exactly unless obviously malformed
- distinguish user-provided data from external enrichment
- do not invent private contact details

## Notes

CRM notes may contain sensitive investor, founder, or deal context. Do not quote more than needed, and ask before adding subjective or sensitive notes.
