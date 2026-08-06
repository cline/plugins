# Sub-workflow playbooks for airtable-product-ops

Playbooks for the lead 10 sub-workflows named inline in `SKILL.md`, plus a longer tail of reference-available shapes. Load only the section that matches the user's invocation; don't read the whole file.

Each playbook follows the same shape:

-   When this fires -- the user phrasings that surface it.
-   Setup-mode prep -- schema additions or extensions needed (if any).
-   Work-mode operations -- what the agent does via the MCP.
-   What gets handed off -- `airtable-link` target plus any UI configuration steps.
-   Sample output -- the shape of the agent's response.

## 1. Roadmap and portfolio management

The single most common airtable-product-ops invocation. Track initiatives across teams, link them to OKRs, surface status to leadership, run portfolio reviews.

When this fires: _"set up a product roadmap"_, _"build me a roadmap base"_, _"track initiatives across squads"_, _"portfolio review for executives"_, _"now / next / later board"_.

Setup-mode prep: small (3-table) shape minimum; mid (5-6-table) once OKRs and sprint linkage matter; large or enterprise once cross-team rollups are needed. Add `RICE score` formula on Roadmap; add `Target quarter` and a timeline view; add stakeholder-specific interfaces.

Work-mode operations:

1. Identify roadmap scope -- single team or org-wide?
2. Fetch current Roadmap records via `list_records_for_table`; filter to active statuses (Now / Next).
3. Score or re-score by RICE / WSJF if requested.
4. Update statuses, ownership, or quarter assignments as the user directs.
5. For portfolio reviews: aggregate by Squad / Quarter / OKR linkage; produce a summary the agent can hand back.

Hand off: link to the Roadmap table or the Leadership interface page (whichever the access surface proves). For multi-table updates, link the base.

Sample output:

```
Updated 12 roadmap items -- scored via RICE, set Q3 target on 5 high-confidence items, moved 2 to "Next."

Top 3 by RICE:
  1. [Feature A] -- RICE 24
  2. [Feature B] -- RICE 18
  3. [Feature C] -- RICE 14

[View Roadmap table in Airtable](https://airtable.com/<appId>/<tblId>)
```

## 2. Voice of Customer / feedback synthesis

Multi-channel feedback intake, categorization, and feedback-to-feature linkage with rollup counts. The second most common invocation; pairs with roadmap management.

When this fires: _"track product feedback"_, _"VoC hub"_, _"customer feedback intake"_, _"theme our feedback"_, _"feedback portal"_, _"categorize support tickets by product area"_.

Setup-mode prep: ensure Customer feedback table exists with `Source`, `Theme` (multipleSelects), `Sentiment`, `Verbatim`, `Related roadmap items` (linked-record to Roadmap). For B2B, also link to Accounts. For consumer, also link to Cohorts. Add `Feedback count` rollup on Roadmap.

Work-mode operations:

1. Fetch recent unprocessed feedback via `list_records_for_table` with a filter on `Theme isEmpty` or `Status = "New"`.
2. For each record: read the Verbatim, classify the Theme(s), set Sentiment, and link to Related roadmap items where the connection is clear.
3. For ambiguous cases, leave Theme empty and flag for human review rather than guessing.
4. Update `Last processed at` if the schema tracks it.
5. Surface top emerging themes (most frequent, fastest-growing) as a summary.

Hand off: link to the Customer feedback table filtered to "Recently themed" or to a "Theme summary" interface page if one exists.

Sample output:

```
Themed 47 feedback items across 5 themes:
  - Performance (18 -- up 40% week-over-week)
  - UX confusion (12)
  - Missing integration (9 -- 3 tied to existing roadmap items)
  - Pricing concern (5)
  - Other (3)

[View Customer feedback in Airtable](https://airtable.com/<appId>/<tblId>?view=...)
```

For B2B contexts, also surface ARR-weighted theme totals (sum of `Account.ARR` per theme) -- this is often the prioritization input executives care about.

## 3. Engineering-tracker translation layer

Airtable upstream for strategy (where the roadmap lives, where customer feedback ties in, where execs look), Jira / Linear / ADO downstream for execution. The customer's primary value is making engineering work legible to non-engineers; Airtable acts as the human-friendly veneer over the engineering tracker. A common pattern when an engineering tracker is already in place.

When this fires: _"sync with Jira"_, _"connect Airtable to Linear"_, _"my execs can't read Jira"_, _"bidirectional sync"_, _"keep engineering and product in lockstep"_, _"limited Jira literacy outside Product / Engineering"_, _"manual translation of Jira data for executives"_.

Setup-mode prep: add `Jira epic ID` (singleLineText) and `Jira sync status` (singleSelect: Synced, Pending, Failed) on Roadmap. Recommend bidirectional sync at epic level only -- not per-ticket -- to avoid sync churn at fine grain.

Work-mode operations: sync setup is usually best done via Airtable's native Sync wizard (UI) rather than scripted via API; hand off the configuration step. Once configured, Airtable's Jira sync runs on a schedule -- defer to `support.airtable.com` for the current refresh cadence rather than embedding a number here. For initial wiring:

1. Confirm scope -- which Jira project(s) and which Airtable Roadmap field maps to Jira epic.
2. Hand off the sync configuration step with a clear link to the Airtable sync setup interface.
3. If the user wants to pre-create epics from Airtable Roadmap items: use a form or automation to push new Roadmap records into Jira as epics.
4. For one-off translation (executive summary of Jira state): pull current Roadmap records, summarize by status and quarter, surface what changed since last review.

Hand off: link to the Roadmap table and the sync configuration interface.

Sample output:

```
Wired Roadmap to Jira project [PROJ]. Sync is bidirectional at epic level.

Configure the sync in Airtable's UI:
  - Set up Jira sync -- [click here]
  - Map Jira epic fields to Roadmap fields (Name -> Summary, Status -> Status) -- [click here]

New Roadmap items pushed to Jira create epics with linked Airtable record IDs preserved. (Sync runs on a schedule -- check support.airtable.com for current cadence.)

[View Roadmap base](https://airtable.com/<appId>)
```

For Linear: Linear has its own MCP, so an agent-driven workflow can integrate directly without a sync layer. Worth surfacing as an option when the user is on Linear.

## 4. Product launch / GTM coordination

Coordinating cross-functional work around releases -- UAT tracking, customer approvals, GTM asset readiness, status updates to stakeholders.

When this fires: _"manage product launches"_, _"launch coordination"_, _"release readiness"_, _"GTM tracking"_, _"UAT signoff"_, _"customer notifications for the Q3 release"_.

Setup-mode prep: extend Releases table with `UAT status`, `Customer approvals required` (multipleRecordLinks -> Accounts), `Launch checklist` (multipleRecordLinks -> Launch tasks). Add a Launch tasks table:

-   `Task` (singleLineText, primary)
-   `Release` (multipleRecordLinks -> Releases)
-   `Owner` (singleCollaborator)
-   `Function` (singleSelect: PM, Engineering, Design, Marketing, Sales, CS, Legal, Other)
-   `Due` (date), `Status` (singleSelect: To do, In progress, Blocked, Done)

Work-mode operations:

1. Identify the target Release record.
2. Generate launch checklist from a template if the release is new, or fetch existing Launch tasks if it's mid-flight.
3. Update task statuses based on user input.
4. Surface blockers (Status = Blocked) and at-risk items (Due within 3 days and Status ≠ Done).
5. For customer approvals: list pending Accounts, surface those at risk of missing the launch window.

Hand off: link to the Release record or a Launch readiness interface filtered to the active release.

Sample output:

```
Q3 release launch readiness check:

✅ On track: 18 / 24 tasks
⚠️  Blocked: 2 -- Marketing assets (Design pending revision), Sales enablement deck (waiting on pricing approval)
🔴 At risk: 1 -- Customer beta sign-off (3 of 5 customers haven't responded)

[View Q3 Release record](https://airtable.com/<appId>/<tblId>/<recId>)
```

## 5. OKR alignment and strategic planning

Mapping initiatives to OKRs, rolling up progress by exec owner, surfacing drift between strategic intent and operational work.

When this fires: _"set up OKRs"_, _"OKR cascade"_, _"align roadmap to objectives"_, _"quarterly portfolio review"_, _"monthly OKR rollup"_.

Setup-mode prep: ensure OKRs table exists (`Objective`, `Period`, `Owner`, `Status`, `Linked initiatives`, `Progress`). Roadmap items get `Linked OKR` (multipleRecordLinks -> OKRs). Add a rollup on OKRs: `Initiative count`, `Initiative-weighted progress` (rollup of Roadmap.RICE or Roadmap.Status proxy).

Work-mode operations:

1. Fetch current period's OKRs.
2. For each: list linked initiatives, summarize status (On track / At risk / Off track) based on rollup data.
3. Identify orphan initiatives (Roadmap items with no linked OKR) and surface them -- these are candidates to either tie to an OKR or drop from the roadmap.
4. Identify orphan OKRs (objectives with no linked initiatives) -- these are likely off the roadmap.

Hand off: link to the OKR review interface or the OKRs table filtered to current period.

Sample output:

```
2026 Q2 OKR status:

✅ On track: 3 of 5 objectives
⚠️  At risk: 1 -- "Improve activation rate 20%" (3 initiatives, none in active sprint)
🔴 Off track: 1 -- "Ship enterprise SSO" (1 initiative, status: On hold)

Orphan initiatives (in Roadmap, no OKR linked): 7
Orphan OKRs (no initiatives linked): 0

[View OKRs in Airtable](https://airtable.com/<appId>/<tblId>)
```

## 6. Single-PM-tool replacement

Migrating from Productboard, Aha, Cycle, Monday, Smartsheet, Notion, Miro, or DoubleLoop into Airtable. Frame the conversation as "rip-and-replace single-purpose PM tools," not just one competitor. Common displacement; explicit migration narrative -- usually accompanied by frustration with rigidity, custom-report dependence on CSMs, or _"fields that can't be hidden creating clutter."_

When this fires: _"replace Productboard"_, _"migrate off Aha"_, _"move from Cycle"_, _"consolidate our PM tools"_, _"we have a bunch of separate tools and want one place"_.

Setup-mode prep:

1. Ask which tool(s) they're replacing -- this surfaces the schema they're used to.
2. Confirm whether the migration is greenfield (start fresh) or import-existing-data.
3. Scaffold the appropriate schema shape (most often mid or large).
4. If importing: agree on a CSV export from the old tool, an import plan (which fields map to which), and pilot it on a small slice first.

Work-mode operations:

1. Set up the schema per the scope answers.
2. For data import: ingest the CSV (usually via Airtable's CSV importer in the UI, or via the API for larger volumes), map fields, validate the first batch with the user before doing the full import.
3. Audit the imported data -- look for fields the old tool's structure doesn't translate cleanly into Airtable's typed fields (free-text dumps that should become singleSelects, etc.).
4. Optionally set up automations the user previously had in the old tool.

Hand off: link to the freshly populated base.

Sample output:

```
Migrated 247 feature requests from Productboard CSV into your new Customer feedback table.

Field mapping applied:
  - Productboard "Status" -> Airtable "Theme" (multipleSelects) [needs your review]
  - Productboard "Insights" -> Airtable "Verbatim" (multilineText)
  - Productboard "Insight Author" -> Airtable "Submitted by" (singleLineText)

3 fields didn't map cleanly -- flagged in the "Migration audit" view.

[View migrated feedback](https://airtable.com/<appId>/<tblId>?view=...)
```

## 7. Capacity / resource-allocation modeling

Plan-vs-actuals capacity rollup, dependency-aware re-planning, cut-line scenarios, days-per-quarter-per-engineer. The shape that replaces _"weekend reporting marathons"_ for product portfolio leads.

When this fires: _"capacity planning"_, _"resource allocation"_, _"cut-line scenarios"_, _"who has capacity in Q3"_, _"if we lose a designer, what slips"_.

Setup-mode prep: enterprise or large shape. Add Capacity per team-quarter table; add Cut-line scenarios table; add `Person-weeks estimate` field on Roadmap.

Work-mode operations:

1. Fetch capacity data: Team members table for individual capacity, or Capacity-per-team-quarter table for aggregate.
2. Aggregate committed work: rollup `Person-weeks estimate` on Roadmap filtered to the target quarter and team.
3. Compute utilization (committed / available).
4. Produce a scenario: which items fit above the cut-line, which fall below, what's the marginal trade?
5. For "what if" requests: clone the current scenario, adjust an input (capacity, scope, priority), recompute.

Hand off: link to the Cut-line scenarios table or a Scenario comparison interface.

Sample output:

```
Q3 capacity scenario:

Team A: 240 person-weeks available, 280 committed (117% utilization -- over)
Team B: 180 person-weeks available, 160 committed (89% utilization)
Team C: 200 person-weeks available, 220 committed (110% utilization -- over)

If we hold the line at 100% utilization, the following items move below the cut-line:
  - [Feature X] (Team A, 12 pw)
  - [Feature Y] (Team C, 8 pw)

[View Cut-line scenarios](https://airtable.com/<appId>/<tblId>)
```

## 8. Customer-facing roadmap portal

External or partner-facing roadmap views with preview / beta visibility, voting, and subscriptions. Common pattern -- not an edge case. Often calls for the custom-app build layer.

When this fires: _"public roadmap"_, _"customer-facing portal"_, _"let customers vote on features"_, _"external roadmap for partners"_, _"customers subscribe to updates"_.

Setup-mode prep: ensure Roadmap has `External visibility` field (singleSelect: Internal only, Customer preview, Public, Beta-customers only). Add `Customer votes` (count or rollup from a Votes table) if voting matters.

Build-shape decision: this is a strong custom-app case. Airtable Interface Designer can do read-only sharing of a table view, but for true public-facing, branded, SEO-friendly, or marketing-grade portals, build a Next.js app on Vercel that reads via REST API. See `references/build-shapes.md` for the portal pattern.

Work-mode operations:

1. Set up the External visibility filtering on Roadmap.
2. For Interface-only path: configure a public shared interface page; hand off the sharing config to the user.
3. For custom-app path: scaffold a Next.js app with a PAT scoped to `data.records:read` on the relevant table, deploy to Vercel, hand off the URL.
4. Optionally: add a Votes table + intake form for customer feature voting; wire up notifications.

Hand off: link to both the underlying Airtable base AND the public portal URL.

Sample output:

```
Built a customer-facing roadmap portal:

🛠️ Custom app:
  - Next.js portal at https://roadmap.example.com
  - Reads Roadmap (filtered to External visibility = Public) via REST API
  - PAT scoped to data.records:read on the Roadmap table

🎨 Configure in Airtable:
  - Confirm the External visibility filter -- [click here]
  - Enable customer voting form (optional) -- [click here]

[View Roadmap base](https://airtable.com/<appId>)
```

## 9. Idea-intake gating with structured scoring

Enforcing structured submission for new feature ideas -- RICE, WSJF, or Lean Canvas templates. Heavy emphasis on preventing _"free-for-all"_ intake that overwhelms triage.

When this fires: _"feature request intake"_, _"score ideas"_, _"RICE on intake"_, _"WSJF"_, _"Lean Canvas"_, _"too many feature requests, need structure"_.

Setup-mode prep: add Intake table (or extend Customer feedback / Roadmap with an Intake form view). Required fields on intake:

-   `Title` (singleLineText, primary)
-   `Submitter` (singleLineText or singleCollaborator)
-   `Problem statement` (multilineText) -- what's the pain
-   `Proposed solution` (multilineText)
-   `Reach` / `Impact` / `Confidence` / `Effort` (numbers, for RICE) OR `Business value` / `Time criticality` / `Risk reduction` / `Effort` (for WSJF)
-   `Calculated score` (formula based on whichever scoring method)
-   `Status` (singleSelect: Intake, Triage, Accepted, Rejected, Duplicate)
-   `Linked roadmap item` (multipleRecordLinks -> Roadmap, populated when promoted)

Build a Form view on the intake table for submitters. Lock the structure so the form enforces required fields.

Work-mode operations:

1. Fetch intake records in Status = Intake.
2. For each: compute or verify the scoring formula, check for duplicates (similarity match against existing Roadmap and Intake), classify by Theme.
3. Surface a triage queue sorted by `Calculated score`.
4. For accepted items: promote to Roadmap, link back to the intake record.
5. For duplicates: link to the existing record, mark as Duplicate.

Hand off: link to the intake triage interface or the Intake table filtered to triage queue.

Sample output:

```
Triaged 23 intake items:

Promoted to Roadmap (top 5 by RICE):
  - [Idea 1] -- RICE 18
  - [Idea 2] -- RICE 15
  - ...

Marked as Duplicate: 4 (linked to existing Roadmap items)
Rejected (low score + no clear problem statement): 6
Remaining in triage: 8

[View Intake triage](https://airtable.com/<appId>/<tblId>?view=...)
```

## 10. Cross-functional release-comms automation

Publishing release notes externally and closing the loop with customers who originally requested shipped features. The pattern goes beyond launch coordination -- it's specifically about communication and traceability.

When this fires: _"release notes"_, _"notify customers when their feature ships"_, _"close-loop on feedback"_, _"changelog automation"_, _"biweekly release updates"_.

Setup-mode prep: ensure feedback-to-feature linkage is intact (Customer feedback links to Roadmap items; Roadmap items link to Releases). Add `Release notes` (multilineText) on Roadmap and a `Notify feedback submitters` checkbox (or automated trigger when status moves to Shipped).

Work-mode operations:

1. Fetch features shipped in the target Release.
2. For each shipped feature: pull linked Customer feedback records.
3. Draft release notes from the linked feature data (or let the user write them and surface the linkage).
4. Identify which feedback submitters to notify; surface the list with their original verbatim alongside what shipped.
5. Optionally: trigger an external notification (email, in-app banner, LaunchNotes publish) via Airtable Automation or a custom app.

Hand off: link to the Release record with shipped features visible, or to the close-loop interface page.

Sample output:

```
Q3 release shipped 12 features. Drafted release notes; identified 47 feedback submitters to close-loop on.

Top 3 by submitter volume:
  - Feature A -- 12 submitters tracked
  - Feature B -- 8 submitters
  - Feature C -- 6 submitters

Configure notifications:
  - Email automation to submitters -- [click here]
  - LaunchNotes publish (if connected) -- [click here]

[View Q3 Release record](https://airtable.com/<appId>/<tblId>/<recId>)
```

## 11. Agent activity log pattern

Opt-in pattern when the user is building an agent-driven airtable-product-ops workflow (recurring feedback triage, multi-step planning, agent running over time). Owned by the `airtable-agent-activity-log` skill -- compose that skill rather than re-implementing inline. The shared skill holds the canonical disclosure language, schema (with the correct single-target-per-`multipleRecordLinks` design), and use guidance.

Product-ops-specific notes for the composition:

-   Tables the agent typically touches (pass these through to `airtable-agent-activity-log` so the per-target linked-record fields are scaffolded correctly): Roadmap items, Customer feedback, Releases, OKRs, plus whatever specialized tables the org has (Sprints, Sprint tasks, Team members, Customer accounts, etc.).
-   Trigger phrases in airtable-product-ops context: _"agent triaging feedback every morning,"_ _"the agent should propose roadmap changes for me to approve,"_ _"set up a self-running PM workflow,"_ _"agent log of how we got to this prioritization."_
-   The log is parallel to the work tables, not nested in them. Don't conflate _"what we're building"_ (Roadmap items, Releases) with _"what the agent did while helping us build it"_ (`Agent activity log`). The shared skill enforces this; reinforce in airtable-product-ops context where the line can blur (e.g., agent that auto-themes feedback shouldn't write theming results into `Agent activity log` instead of the Customer feedback table -- both records get written, one per surface).
-   Hand off via `airtable-link` to the `Agent activity log` table or a per-session view.

## Reference-available sub-workflows (longer tail)

The 12 shapes below appear in real airtable-product-ops setups but cover narrower segments. Load when scope answers surface them; don't lead with these in the SKILL.md body.

### PLM-adjacent (apparel and manufacturing)

Style / SKU tracking with variants, BOM, costing, vendor collaboration via synced bases, sample tracking. Surfaces when the user uses apparel / manufacturing vocabulary: line plan, range plan, share-of-season, carryover styles, FOB, MOQ, tech pack, BOM. Pairs with the stage-gate schema shape (regulated approvals for product launches). Add tables: Styles, Variants, BOM lines, Vendors, Samples.

### External partner-roadmap tracking

Track what partner platforms are launching so the team can operationalize their own work around it. Niche but real (e.g. streaming-platform tracking, integration-partner roadmaps). Add a Partner roadmap table that mirrors the partner's published roadmap with internal `Our action` and `Our impact` fields.

### Pre-ERP / pre-PIM data-staging hub

Airtable as the working layer feeding a downstream system of record (ERP, PIM), not replacing it. Pattern when the user says _"we still need SAP / NetSuite / our PIM, but it's a pain to work in directly."_ Schema mirrors the downstream system's structure; sync via API or scheduled export feeds the SoR.

### Experimentation lifecycle hub

Hypothesis intake -> experiment platform (Statsig, LaunchDarkly, custom) -> insights hub -> modeled impact. Distinct from feature roadmap -- this is the testing lifecycle. Add Hypotheses, Experiments, Results tables; integration with the experiment platform via API or webhook.

### R&D / customer-research participant management

Recruitment lists, scheduling, consent tracking, transcripts, synthesis -- with PII governance (restricted views, field-level permissions, audit trail). Surfaces in user-research-heavy teams. Add Participants, Sessions, Transcripts, Insights tables.

### Live executive feature-voting at scale

Real-time polling of hundreds of stakeholders on roadmap features. Pattern: pre-create rating records per voter to bypass form "one record per submission" limits, push results via Interface page with live aggregation. Niche but powerful when the user has a large stakeholder body (300+).

### SKU / portfolio rationalization

Consolidating SKU specs, attributes, and competitor data for kill/keep decisions across acquisitions or divisions. Surfaces in CPG, manufacturing, large product portfolios. Schema: SKUs table with cost / revenue / strategic-fit fields, competitor-product linked records, kill-keep decision field.

### Sales-enablement battle-card generation

Product catalog + dealer-assessment input -> personalized sales prep. Pairs with the Roadmap and a Customer accounts table; outputs are battle cards generated per account / per product. Often a custom-app case (the battle card is a PDF or HTML page generated from base data).

### M&A pipeline and acquisition-onboarding portal

M&A target scoring + external onboarding portals for newly-acquired companies. Pairs with the M&A holding-company schema shape. Custom-app build layer typical for the external portal.

### Stage-gate / product lifecycle (PLC) phase governance

Regulated-industry phase-gated approvals -- banking, pharma, aerospace, CPG. Pairs with the stage-gate schema shape. Audit-history-heavy; compliance-check rollups; required-approver enforcement.

### SAFe / PI-planning orchestration

Formal Program Increment cadence with intake -> PI staging -> cross-team dependencies -> board rollup. Pairs with the enterprise schema shape. Surfaces when the user uses SAFe / PI / Program Increment vocabulary explicitly.

### Outcomes-based roadmap with cascading key-result rollups

Shifts framing from features to outcomes with key-result rollups and multi-quarter swimlanes. The "feature factory" antidote. Schema centers on Outcomes (not Features) as the primary unit; features link up to outcomes. Pairs with OKR alignment; distinct enough from generic roadmap management to deserve its own framing.
