# Schema shapes for airtable-product-ops scaffolding

Field-by-field detail for the schema shapes named in `SKILL.md`. Load the section that matches the scope answers; don't read the whole file.

Each shape comes in three variants -- B2B (named accounts, ARR-weighted prioritization), consumer (aggregate user signals, volume-weighted prioritization), and mixed / B2B2C (both). The base structure is the same across variants; the variants add specific tables and fields. Pick the variant from the third scope question (customer / user shape).

## Lightweight backlog (1 table)

For small engineering teams that want airtable-product-ops structure without enterprise overhead. Customer language: _"refuses to switch away"_ because canonical PM tools feel too heavy for a 5-person team. Don't impose roadmap / feedback structure they won't use.

### Tables

-   Backlog -- every work item the team might pick up.
    -   `Name` (singleLineText, primary)
    -   `Status` (singleSelect: Idea, Up next, In progress, Shipped, Won't do) -- color-code with red / yellow / blue / green / grey
    -   `Priority` (singleSelect: P0 / P1 / P2 / P3) or `RICE score` (number, formula = Reach × Impact × Confidence / Effort)
    -   `Owner` (singleCollaborator)
    -   `Notes` (multilineText / long-text) -- inline notes / spec content that belongs to the item itself
    -   `Created` (createdTime), `Last updated` (lastModifiedTime)

For threaded discussion / back-and-forth on a backlog item -- _"any reason this isn't P1? @Person can you weigh in?"_ -- use Airtable's native record comments. Every record supports comments (no separate Notes / Discussion table needed); they thread on the record, support @mentions, and show in record-detail and Interface contexts. Defer to `support.airtable.com` for current details on permission levels, notifications, and plan-tier specifics rather than embedding those claims here.

### Variants

-   B2B -- add `Customer ask` (multipleRecordLinks -> Accounts table from a sibling base if relevant). Most lightweight setups skip this; if the team explicitly tracks per-customer asks, push them up to small / mid.
-   Consumer -- no extra structure; the lightweight shape is consumer-shaped by default.
-   Mixed -- same as base; track customer asks via record comments or push them up to small / mid when they're frequent enough to warrant structure.

### Views to hand off

-   Kanban on Backlog grouped by Status -- fastest to set up in the UI.
-   Filtered grid view: "P0 / P1 only" for current focus.

## Solo / small (3 tables)

The default starter shape when the user wants airtable-product-ops but hasn't asked for more structure than that. Three tables cover the dominant small-team needs: what we're building (Roadmap), what we're hearing (Customer feedback), what we've shipped (Releases).

### Tables

-   Roadmap -- initiatives / features / epics being planned and built.
    -   `Name` (singleLineText, primary)
    -   `Status` (singleSelect: Now, Next, Later, Shipped, On hold) -- Now/Next/Later is the most common shape; color-code clearly
    -   `Description` (multilineText)
    -   `Owner` (singleCollaborator)
    -   `Target quarter` (singleSelect: Q1 / Q2 / Q3 / Q4 of relevant years)
    -   `Reach` (number 1-10), `Impact` (number 1-10), `Confidence` (percent), `Effort` (number, person-weeks)
    -   `RICE score` (formula = `Reach * Impact * Confidence / Effort`) -- sort the roadmap by this for prioritization clarity
    -   `Linked feedback` (multipleRecordLinks -> Customer feedback)
    -   `Feedback count` (count of Linked feedback) -- quick demand signal per feature
    -   `Release` (multipleRecordLinks -> Releases)
-   Customer feedback -- raw + categorized feedback from any source.
    -   `Summary` (singleLineText, primary)
    -   `Source` (singleSelect: Support ticket, Slack, Sales call, In-app, NPS, Email, Other)
    -   `Sentiment` (singleSelect: Positive, Neutral, Frustrated, Blocker)
    -   `Theme` (multipleSelects: Performance, UX, New capability, Pricing, Integration, Other -- extend as themes emerge)
    -   `Verbatim` (multilineText) -- the customer's actual words; resist paraphrasing
    -   `Submitted by` (singleCollaborator or singleLineText if external)
    -   `Related roadmap items` (multipleRecordLinks -> Roadmap)
    -   `Submitted at` (createdTime)
-   Releases -- what shipped, when, and what was in it.
    -   `Name` (singleLineText, primary) -- e.g. _"2026.Q3 release"_
    -   `Ship date` (date)
    -   `Status` (singleSelect: Planning, In progress, Released, Released with caveats, Cancelled)
    -   `Features included` (multipleRecordLinks -> Roadmap)
    -   `Release notes` (multilineText or richText)
    -   `Owner` (singleCollaborator)

### Variants

-   B2B variant -- add an Accounts table (or sync from Salesforce). Add `Account` (multipleRecordLinks -> Accounts) to Customer feedback. Add an ARR rollup on Roadmap (`Total ARR of feedback senders` -- rollup `Account.ARR` through Linked feedback) for ARR-weighted prioritization. Add `AE owner` and `CSM owner` (singleCollaborator) on Accounts.
-   Consumer variant -- add a Cohorts table (Segment name, Description, Size, Notes). Add `Cohort` (multipleRecordLinks -> Cohorts) on Customer feedback. Replace ARR rollup with `Feedback volume` rollup. Optionally add `App-store source` (singleSelect: iOS, Android, Web, Other) on Customer feedback.
-   Mixed (B2B2C) variant -- both Accounts and Cohorts tables. Customer feedback links to one or the other (or both); roadmap rolls up volume AND weighted ARR.

### Views and interfaces to hand off

-   Kanban on Roadmap grouped by Status (Now / Next / Later columns).
-   Form view on Customer feedback for non-Airtable users to submit.
-   Calendar view on Releases keyed by Ship date.
-   Interface page: "Executive roadmap" -- read-only summary of Roadmap with RICE sort and key feedback rollups.

## Mid (5-6 tables)

The 3-table shape plus sprint execution and OKR alignment. Three-level hierarchy (OKR -> Roadmap item -> Sprint task) lets the team see how day-to-day work rolls up to strategy.

### Tables added on top of the 3-table shape

-   Sprints -- time-boxed execution periods.
    -   `Name` (singleLineText, primary) -- e.g. _"Sprint 26.31"_
    -   `Start date` (date), `End date` (date)
    -   `Status` (singleSelect: Planning, Active, Closed, Retro complete)
    -   `Sprint goal` (multilineText)
    -   `Tasks` (multipleRecordLinks -> Sprint tasks)
-   Sprint tasks -- the actual work in a sprint.
    -   `Title` (singleLineText, primary)
    -   `Sprint` (multipleRecordLinks -> Sprints)
    -   `Roadmap item` (multipleRecordLinks -> Roadmap)
    -   `Status` (singleSelect: To do, In progress, In review, Done, Blocked)
    -   `Assignee` (singleCollaborator)
    -   `Estimate` (number, story points or hours)
    -   `Blocked reason` (singleLineText) -- populate when Status = Blocked
-   OKRs -- quarterly or annual objectives and key results.
    -   `Objective` (singleLineText, primary)
    -   `Description` (multilineText)
    -   `Period` (singleSelect: 2026.Q1, 2026.Q2, …)
    -   `Owner` (singleCollaborator)
    -   `Status` (singleSelect: On track, At risk, Off track, Achieved, Missed)
    -   `Linked initiatives` (multipleRecordLinks -> Roadmap) -- features tied to this OKR
    -   `Progress` (percent or formula based on linked-initiative status)

### Variants

-   B2B variant -- Roadmap items rollup `Total ARR impacted` via linked feedback -> Accounts. Add a `Customer health` field on Accounts (At risk / Healthy / Champion) and use it as a tie-breaker for feedback prioritization.
-   Consumer variant -- Roadmap items rollup `Feedback volume` and `Sentiment distribution`. Add `Cohort impact` (multipleSelects: New users, Power users, Enterprise tier, Free tier) on Roadmap.
-   Mixed variant -- both rollup patterns coexist; the team chooses which to sort by per context.

### Views and interfaces to hand off

-   Sprint board: Kanban on Sprint tasks grouped by Status, filtered to current Sprint.
-   OKR review interface: read-only, OKR-by-owner with linked-initiative progress rollups.
-   Roadmap-by-quarter timeline view (timeline view on Roadmap, keyed by `Target quarter`).
-   Stakeholder-specific interfaces: "Leadership view" / "PM view" / "Engineering view" -- same data, different slices and field visibility.

## Large (canonical 7-table)

The mid shape plus people management and customer account tracking. Matches Airtable's published airtable-product-ops anatomy. Cross-base sync recommended once the org has multiple product teams; this is the shape that wants org-level rollups.

### Tables added on top of the mid shape

-   Team members -- engineers, PMs, designers, etc. for capacity planning and ownership clarity.
    -   `Name` (singleLineText, primary) -- usually a User field if everyone has Airtable seats
    -   `Role` (singleSelect: PM, Engineer, Designer, Data, Marketing, Sales, CS, Other)
    -   `Squad / pod` (singleSelect or multipleRecordLinks -> Squads table if you have one)
    -   `Manager` (singleCollaborator)
    -   `Capacity` (number, person-days / sprint or person-weeks / quarter)
    -   `Active sprint tasks` (count of Sprint tasks where Assignee = this person)
-   Customer accounts -- for B2B and mixed setups; consumer setups usually swap this for a Cohorts table.
    -   `Account name` (singleLineText, primary)
    -   `ARR` (currency)
    -   `Tier` (singleSelect: Enterprise, Mid-market, SMB, Self-serve)
    -   `Industry` (singleSelect or multipleSelects, depending on how many overlap)
    -   `Customer health` (singleSelect: Healthy, Watch, At risk, Champion)
    -   `AE owner` / `CSM owner` (singleCollaborator)
    -   `Renewal date` (date)
    -   `Linked feedback` (multipleRecordLinks -> Customer feedback)
    -   `Linked roadmap items` (multipleRecordLinks via lookup through Customer feedback)

### Variants

-   B2B variant -- Customer accounts table is central; ARR rollups on Roadmap drive prioritization. Add a Sales pipeline table if commit-blocking deals need visibility into roadmap.
-   Consumer variant -- swap Customer accounts for Cohorts / Segments. Add `User volume` (number) and `Engagement score` (number) on Cohorts. App-store review ingestion via an automation or sync.
-   Mixed variant -- both tables. Customer feedback links to either depending on source. The schema is denormalized but the rollup queries stay clear.

### Views and interfaces to hand off

-   Org-level roadmap rollup interface -- Roadmap by Squad / Quarter, filtered to Now / Next.
-   Team capacity view -- Team members with `Active sprint tasks` and `Capacity` side-by-side.
-   Customer health dashboard -- Accounts with risk signals and linked feedback themes.
-   VoC executive summary interface -- top themes by ARR-weighted impact, with linked verbatim quotes.

## Enterprise / SAFe-shaped

The large shape plus formal multi-team coordination. PI-planning, dependency tracking, capacity-constrained planning with cut-lines, business-case finance fields. Use when the user uses SAFe / PI-planning / Program Increment vocabulary, or operates >=5 squads needing structured cross-team coordination.

### Tables added on top of the large shape

-   Dependencies -- explicit cross-team blocking relationships.
    -   `From` (multipleRecordLinks -> Roadmap) -- the dependent feature
    -   `On` (multipleRecordLinks -> Roadmap) -- what it depends on
    -   `Type` (singleSelect: Hard blocker, Soft dependency, Integration)
    -   `Owner` (singleCollaborator) -- who resolves it
    -   `Status` (singleSelect: Identified, Mitigated, Resolved, At risk)
-   Capacity per team-quarter -- what each team can take on.
    -   `Team` (singleSelect or link)
    -   `Quarter` (singleSelect: 2026.Q1, …)
    -   `Person-weeks available` (number)
    -   `Person-weeks committed` (rollup from Roadmap items in this team / quarter)
    -   `Utilization` (formula = committed / available)
-   PI staging -- Program Increment planning grouping.
    -   `Name` (singleLineText, primary) -- e.g. _"PI 2026.H1"_
    -   `Start` / `End` (date)
    -   `Committed features` (multipleRecordLinks -> Roadmap)
    -   `Stretch features` (multipleRecordLinks -> Roadmap)
-   Cut-line scenarios -- capacity-driven prioritization scenarios.
    -   `Scenario name` (singleLineText, primary) -- e.g. _"Baseline"_, _"+10% engineering capacity"_, _"-1 designer"_
    -   `Above the line` (multipleRecordLinks -> Roadmap)
    -   `Below the line` (multipleRecordLinks -> Roadmap)
    -   `Notes` (multilineText) -- what changed vs. baseline

### Roadmap field additions at this tier

Business-case finance fields on Roadmap (Initiatives):

-   `Capex` (currency) -- capital expenditure portion of the build cost
-   `Opex` (currency) -- operating expenditure
-   `Expected revenue` (currency)
-   `ROI` (formula = `(Expected revenue - Capex - Opex) / (Capex + Opex)`)
-   `IRR` (number, percent) -- internal rate of return; manual or pulled from finance
-   `NPV` (currency) -- net present value; manual or formula with discount rate

These fields matter at the enterprise tier for portfolio investment-case reviews. Smaller teams don't need them and shouldn't be burdened with them.

### Variants

-   B2B variant -- ARR-weighted cut-line scenarios. Accounts table feeds revenue numbers on Roadmap.
-   Consumer variant -- Cohorts table; cut-line scenarios driven by volume / cohort coverage rather than ARR.
-   Mixed variant -- both feeds into the finance fields; cut-line uses combined weighting.

### Views and interfaces to hand off

-   Multi-quarter swimlane view on Roadmap grouped by Squad, keyed by `Target quarter`.
-   PI planning interface -- committed vs. stretch features per PI, with capacity rollups.
-   Dependency graph view -- Dependencies grouped by Team or Type.
-   Cut-line scenario comparison interface -- toggle between scenarios for exec review.

## Stage-gate (niche -- surface on demand)

For regulated industries -- banking, pharma, aerospace, CPG, medical devices -- where features go through phased compliance gates with required approvals. Triggered when the user uses _"stage-gate"_, _"phase-gated"_, _"compliance gate"_, _"product lifecycle (PLC) gates"_, _"APQP"_, or industry-specific gating language.

### Tables added on top of the large or enterprise shape

-   Stage-Gate phases -- phase definitions for the user's process.
    -   `Phase` (singleLineText, primary) -- e.g. Discovery, Concept, Development, Validation, Launch, Post-launch
    -   `Sequence` (number) -- for ordering
    -   `Required approvers` (multipleCollaborators or multipleRecordLinks -> roles)
    -   `Required artifacts` (multilineText) -- what must exist before approval
    -   `SLA days` (number) -- how long the phase typically takes
-   Compliance checks -- gate-specific checks required at each phase.
    -   `Check name` (singleLineText, primary)
    -   `Phase` (multipleRecordLinks -> Stage-Gate phases)
    -   `Required for` (singleSelect: All initiatives, Regulated only, External-facing only, Other)
    -   `Standard reference` (singleLineText) -- regulation / standard the check derives from
-   Approvals -- approval audit trail.
    -   `Initiative` (multipleRecordLinks -> Roadmap)
    -   `Phase` (multipleRecordLinks -> Stage-Gate phases)
    -   `Approver` (singleCollaborator)
    -   `Decision` (singleSelect: Approved, Rejected, Approved with conditions, Pending)
    -   `Decision date` (date)
    -   `Notes` (multilineText)

### Roadmap field additions

-   `Current phase` (singleSelect -- mirrors Stage-Gate phases)
-   `Phase entered at` (date)
-   `Phase due` (date or formula)
-   `Approvals` (multipleRecordLinks -> Approvals)
-   `Compliance status` (formula or rollup over linked Compliance checks)

### Views and interfaces to hand off

-   Gate review interface -- initiatives at each phase, sortable by Phase due.
-   Approval audit log -- Approvals filtered by Phase or Approver.
-   Compliance-status dashboard -- initiatives by `Compliance status`.

## M&A holding company (niche -- surface on demand)

For multi-company portfolios -- private equity holding cos, conglomerates, frequent acquirers -- where each acquired company runs its own product ops but rolls up to a parent. Triggered when the user uses _"multiple sub-companies"_, _"holding company"_, _"acquisition pipeline"_, or M&A vocabulary.

### Tables added on top of the large or enterprise shape

-   Acquired companies -- each sub-company in the portfolio.
    -   `Company name` (singleLineText, primary)
    -   `Acquired date` (date)
    -   `Integration status` (singleSelect: Pre-close, Onboarding, Integrated, Operating)
    -   `Industry` (singleSelect or multipleSelects)
    -   `ARR` / `Revenue` (currency)
    -   `Owner` (singleCollaborator) -- integration lead
    -   `Roadmap base` (URL or text) -- link to the sub-company's Airtable base or external tool
    -   `Linked initiatives` (multipleRecordLinks -> Roadmap)
-   Deal pipeline -- M&A targets being evaluated.
    -   `Target name` (singleLineText, primary)
    -   `Stage` (singleSelect: Sourcing, IOI, LOI, Due diligence, Closing, Closed-won, Closed-lost)
    -   `Strategic fit score` (number 1-10)
    -   `Expected ARR` (currency)
    -   `Owner` (singleCollaborator)
    -   `Next action` (singleLineText)
    -   `Next action date` (date)

### Optional companion: External onboarding portal

For acquired companies that need to submit standardized data post-close, build a custom-app or Interface page that lets external users (the acquired company's team) populate a structured intake form. See `references/build-shapes.md` for the portal pattern.

### Views and interfaces to hand off

-   Portfolio rollup interface -- Acquired companies with ARR, status, and initiative counts.
-   Deal pipeline kanban -- Deal pipeline grouped by Stage.
-   Integration progress dashboard -- Acquired companies filtered to Integration status ≠ Operating, with timeline view by Acquired date.

## Choosing between shapes

If the answers to the scope questions don't obviously map to one shape, lean smaller -- it's easier to add tables than to strip them. The MCP can extend the schema cleanly as the team grows; over-scaffolding a 10-table base for a 5-person team creates clutter and abandoned views.

When in doubt:

-   Default to small / 3-table for solo or small (under 10).
-   Default to mid / 5-6-table for 10-50 with PM function.
-   Default to large / 7-table for 50+ with cross-functional product ops.
-   Default to enterprise / SAFe-shaped only when the user uses SAFe / PI vocabulary or operates >=5 product squads.
-   Surface stage-gate only when the user uses gating vocabulary or works in a regulated industry.
-   Surface M&A only when the user explicitly operates a multi-company portfolio.
