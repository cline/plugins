---
name: airtable-agent-activity-log
description: Scaffold and operate an opt-in `Agent activity log` table that records what the agent did, decided, and got blocked on across a long-running or multi-session Airtable workflow. Use whenever a workflow skill (airtable-product-ops, airtable-sales-ops, airtable-marketing-ops, etc.) is being set up for an agent-driven motion (recurring triage, multi-step plan, automated monitoring, agentic workflow), or when the user explicitly asks for "agent activity tracking," "audit log of agent decisions," "agent memory," "track what the agent did," or similar. The pattern is opt-in (front-load the offer, frame as auditability for the user's benefit, not surveillance). Composes into workflow skills the same way `airtable-link` does -- workflow skills point at this skill rather than re-implementing the schema inline.
license: MIT
metadata:
    version: '1.0.0'
    author: airtable
---

# Agent activity log

A typed audit log of agent decisions, blockers, and outcomes -- opt-in for users who are explicitly building an agent-driven workflow. The selling point: humans (and the next agent session) can read back what the agent did and why, without trusting a context-window summary that may be gone tomorrow. Pairs naturally with Airtable's role as a persistent agent substrate.

This skill owns the schema and disclosure language. Workflow skills (airtable-product-ops, airtable-sales-ops, airtable-marketing-ops, etc.) compose this skill rather than re-implementing the pattern; they trigger it when the user's intent surfaces an agent-driven workflow and pass through to this skill for the scaffolding + ongoing use.

## When this fires

Trigger phrases -- workflow skills should offer this to the user when any of these surface:

-   _"track what the agent is doing"_, _"agent activity log,"_ _"audit log of agent decisions"_
-   _"long-running workflow,"_ _"agent memory,"_ _"persistent state for the agent"_
-   _"keep a record of what changed and why"_
-   Setup-mode invocations describing an agent-driven motion: _"I want the agent to triage feedback every morning,"_ _"the agent should propose changes for me to approve,"_ _"set up a self-running workflow"_

Surface proactively when the user's language signals they're building something the agent will run repeatedly or autonomously -- not for one-shot interactions.

## Disclosure (opt-in, not surveillance)

Front-load the offer. The user agrees up front or declines; either is fine.

> _"I can also set up a log of my own activity in a table called `Agent activity log` so you can audit what I've done and why. It tracks every record I create or modify with the reasoning. It's opt-in -- if you'd rather not have it, we'll skip it. Want me to include it?"_

Frame as auditability for the user's benefit -- they can see what the agent decided, what got changed, and where the agent got stuck. Not as monitoring the agent for its own sake.

## Schema

A single `Agent activity log` table. Keep it out of stakeholder-facing Interfaces -- this is internal audit data for the agent's operator, not content the broader team should browse in the app.

### Core fields

-   `Summary` (singleLineText, primary) -- one-line what-happened. This is the primary field.
-   `Timestamp` (createdTime) -- when the event happened.
-   `Action` or `Event type` (singleSelect: `Read`, `Create`, `Update`, `Delete`, `Decision`, `Blocker`, `Question`, `Completion`, `Error`) -- adapt the choices to the workflow's grain.
-   `Reasoning` or `Detail` (multilineText) -- what the agent intended and why, including inputs considered and alternatives rejected
-   `Outcome` (singleSelect: `Completed`, `Partial`, `Failed`, `Blocked`)
-   `Status` (singleSelect: `Open`, `Acknowledged`, `Resolved`, `Stale`) -- for blockers and questions that need human follow-up
-   `Session ID` (singleLineText) -- tie events from one agent invocation together

### Linking to the records the agent touched

Airtable's `multipleRecordLinks` field is bound to a single target table at field-creation time -- there is no polymorphic linked-record field that spans multiple tables. Two viable patterns:

1. Per-target linked-record fields (recommended) -- one `multipleRecordLinks` field per table the agent might touch. For a airtable-product-ops base: `Linked Roadmap item`, `Linked Customer feedback`, `Linked Release`, `Linked OKR`. For a airtable-sales-ops base: `Linked Account`, `Linked Contact`, `Linked Opportunity`, `Linked Activity`. The agent populates whichever field matches the touched record's table; the others stay empty. Gives reverse-link navigation -- opening a touched record shows all `Agent activity log` entries that touched it, automatically. Slightly more schema overhead per added table the agent touches.
2. URL-only fallback -- a single `Target record URL` (URL field) holding the deep-link to the touched record. No reverse-link navigation, no rollups across the log, but simpler schema. Reasonable when the agent touches many tables and per-table linked fields would get unwieldy, or for early-stage setups where browser-driven inspection is fine.

Most builds use pattern 1 for the 3-5 tables the agent touches most often + pattern 2 as fallback for ad-hoc touches -- add a `Target record URL` field alongside the per-table linked-record fields and populate it whenever the touched record's table isn't one of the wired-up linked fields.

Add a `Target table` (singleSelect of the workflow's tables) so a viewer can quickly see which kind of record an entry touched, even before clicking through.

### Schema variants per workflow domain

The shape is the same across workflow skills; the per-target linked-record fields change to match the parent base's tables. The workflow skill that's invoking `airtable-agent-activity-log` knows its own table inventory and should pass them through.

## Use guidance

Throughout any agent-driven session, write events to the log as decisions are made or blockers surface. Pattern:

1. At session start: write an event with `Action = Completion`, `Outcome = Completed`, and `Summary` describing what the session is starting on. The `Session ID` for this entry becomes the tie-thread for the rest of the session's writes.
2. On each meaningful decision: write a `Decision` event with the full reasoning in `Reasoning`. Include alternatives considered and why they were rejected.
3. On blockers: write a `Blocker` event with `Status = Open`, link to the affected records via the per-table linked-record fields.
4. On questions for the human: write a `Question` event with `Status = Open`, link to the affected records. The human can answer by updating the record (e.g., adding a comment or moving status to `Acknowledged`).
5. On errors: write an `Error` event with `Outcome = Failed` and the error context in `Reasoning`.
6. At session end: write a `Completion` event summarizing the session's outputs and any unresolved items.

Don't over-write -- log meaningful decisions and changes, not every tool call. Reads in particular usually don't need to be logged unless the workflow's audit value depends on it.

## Composition into workflow skills

The workflow skill (airtable-product-ops, airtable-sales-ops, airtable-marketing-ops, etc.) should:

1. Surface this pattern to the user when the trigger phrases above appear, framing it as opt-in.
2. Compose `airtable-agent-activity-log` -- don't re-implement the schema inline; point at this skill the same way workflow skills point at `airtable-link` for the URL-handoff pattern.
3. Pass through workflow-specific context -- the tables the agent will be touching, so the per-target linked-record fields can be scaffolded correctly for that workflow.
4. Hand off at session end via `airtable-link` -- link to the `Agent activity log` table or to a "Recent agent activity" Interface view so the user can inspect.

Suggested workflow-skill body language:

> _"When the user wants agent-activity tracking (`'audit log of agent decisions,' 'long-running workflow,' 'agent memory,'` etc.), compose the `airtable-agent-activity-log` skill. Frame as opt-in -- disclose first, scaffold after the user agrees. Pass the workflow's record-touching tables through so the per-target linked-record fields get scaffolded for the right tables."_

## Composition with `airtable-link`

At session end (or when surfacing what the agent did), hand off to the user with a `airtable-link` to the `Agent activity log` table -- or to a dedicated Interface view filtered to the current `Session ID` so the user sees only this session's activity. Both are valid; pick based on the user's stated preference for browsing vs. session-by-session review.

## Anti-patterns

-   Don't auto-create `Agent activity log` without disclosure. This pattern earns trust when offered; it erodes trust when imposed. Always disclose first.
-   Don't claim "polymorphic" linked-record fields. Airtable's `multipleRecordLinks` field is bound to a single target table -- schema-design accordingly with the per-table linked-record + URL-fallback pattern above.
-   Don't conflate the agent log with the workflow's normal tables. `Agent activity log` records what the agent did while helping; the workflow tables (Opportunities, Roadmap items, Campaigns, Projects, etc.) record what the team is working on. Keep them parallel, linked, but distinct.
-   Don't surveillance-frame. Disclosure language frames as auditability for the user's benefit, not monitoring the agent for its own sake.
-   Don't over-log. Meaningful decisions and changes, not every tool call. Reads usually don't need logging unless the audit story specifically depends on it.
