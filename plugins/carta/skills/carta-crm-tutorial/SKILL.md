---
name: carta-crm-tutorial
description: Interactive walkthrough for Carta CRM workflows in Cline. Use when the user asks how to get started with Carta CRM, search records, add investors, create companies, manage deals, write notes, or update fundraising data.
version: 1.0.0
---

# Carta CRM Tutorial

Use this skill to orient users before they run live Carta CRM workflows. Keep it short, practical, and explicit about write confirmation.

## Ground Rules

- Do not write to Carta CRM during the tutorial unless the user explicitly asks to try a real operation.
- Do not create cache markers or write host-specific state files.
- Use the plugin-owned `carta` MCP server after the user authorizes it in Cline.
- Before any create or update operation, summarize the exact record and fields that will change.

## What Carta CRM Skills Cover

- `carta-crm-search-investors`, `carta-crm-search-companies`, `carta-crm-search-contacts`, `carta-crm-search-deals`, `carta-crm-search-notes`, and `carta-crm-search-fundraisings` retrieve existing CRM records.
- `carta-crm-add-investor`, `carta-crm-add-company`, `carta-crm-add-contact`, `carta-crm-add-deal`, `carta-crm-add-note`, and `carta-crm-add-fundraising` create new CRM data after confirmation.
- `carta-crm-update-investor`, `carta-crm-update-company`, `carta-crm-update-contact`, `carta-crm-update-deal`, `carta-crm-update-note`, and `carta-crm-update-fundraising` change existing data after confirmation.
- `carta-crm-enrich-company` researches a company website and separates external enrichment from user-provided CRM data.
- `carta-crm-lookup-fund-portfolio` can inspect a public fund website for portfolio companies when that external lookup is appropriate.

## Walkthrough

1. Ask whether the user wants to learn search, create, update, enrichment, or fundraising workflows.
2. Show two or three example prompts for the chosen workflow.
3. Explain what identifiers matter: record IDs are safest, but names, domains, fund names, and deal context can be used for search first.
4. Explain that Cline should search before creating or updating to avoid duplicate records.
5. For write examples, show the confirmation pattern:
   - record to change or create
   - fields and values
   - any inferred or externally enriched data
   - whether the user approved the write
6. Route to the specific CRM skill once the user picks a real task.

## Example Prompts

- "Find investors named Redwood and show me their IDs."
- "Create a company record for Apex Analytics with apex.example as the website."
- "Move the Apex Analytics deal to Partner Meeting after I confirm."
- "Add a note to the Apex Analytics deal with this meeting summary."
- "Update Sarah Chen's contact title after searching for the right contact."

## Safety

CRM data can include confidential deal, investor, founder, contact, and note context. Keep outputs scoped, do not invent private details, and ask before adding subjective or sensitive notes.
