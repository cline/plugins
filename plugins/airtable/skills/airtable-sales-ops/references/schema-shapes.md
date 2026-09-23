# Schema shapes for airtable-sales-ops scaffolding

Field-by-field detail for the schema shapes named in `SKILL.md`. Load the section that matches the scope answers; don't read the whole file.

Vertical-specific shapes (brokerage, real estate, mortgage, capital markets, public works, nonprofit, partner CRM) live in `vertical-shapes.md`. Specialized shapes (Deal Desk, Reference DB, sales engineering capacity, sales bookings forecast, RFP / tender) live below at the end of this file.

Before scaffolding any Interface page, verify the layout type against the current Airtable support docs at `support.airtable.com` (WebFetch the relevant page for any non-trivial layout). Interface page recommendations below name the layout type inline -- Record review, Dashboard, List, Form, etc. -- to make the layout-to-surface mapping explicit at scaffolding time. Plan-tier gates and feature-availability claims (e.g., conditional Field visibility, multi-series charts, dashboard-only components, mobile parity) drift fastest; re-verify those at execution time.

## Lightweight pipeline (1-2 tables)

For solo founders, 2-3 person teams, deal trackers without dedicated SDR/AE function. Customer language: _"I just need to track deals"_, _"a list of who I've talked to"_, _"don't want a big CRM"_. Don't impose multi-table structure they won't use.

### Tables

-   Pipeline -- every deal / lead / opportunity in motion.
    -   `Name` (singleLineText, primary) -- usually the deal or opportunity name
    -   `Stage` (singleSelect: Lead, Qualified, Proposal, Negotiation, Closed-Won, Closed-Lost) -- color-code with grey / yellow / blue / orange / green / red
    -   `Account` (singleLineText) -- flat string at this scale; promotes to a linked record when the team grows
    -   `Amount` (currency)
    -   `Probability` (number, percent) -- 0-100
    -   `Expected close` (date)
    -   `Owner` (singleCollaborator)
    -   `Next action` (singleLineText), `Next action date` (date)
    -   `Source` (singleSelect: Inbound web / Outbound / Referral / Partner / Event / Other)
    -   `Notes` (multilineText)
    -   `Created` (createdTime), `Last updated` (lastModifiedTime)
-   Contacts (optional second table) -- for solo / small teams who want a CRM-shaped contact list.
    -   `Name` (singleLineText, primary)
    -   `Email` (email)
    -   `Phone` (phoneNumber)
    -   `Company` (singleLineText)
    -   `Title` (singleLineText)
    -   `Related deals` (multipleRecordLinks -> Pipeline)
    -   `Last contacted` (date or rollup from Pipeline's last-updated)

### Views to hand off

-   Kanban on Pipeline grouped by Stage -- fastest to set up; the most-recognizable airtable-sales-ops view
-   Filtered grid view: "Open deals (Stage ≠ Closed-Won, Closed-Lost) sorted by Expected close ascending"
-   Calendar view on Pipeline keyed by Next action date

### Variants

-   B2B variant -- Account becomes a linked record (small Accounts table with `Name`, `Tier`, `Industry`, `ARR`, `Owner`). One AE owning multiple accounts; multi-thread Contacts per Account.
-   Consumer variant -- drop Account; collapse Pipeline + Contacts into one. Customer ↔ Deal one-to-one.
-   Brokerage variant -- see `vertical-shapes.md` for commission calculation overlay.

## Solo / small (3 tables)

Classic CRM triangle. Default starter when the user wants a CRM without an existing one to augment. Three tables cover the dominant small-team needs: who we're selling to (Accounts), who we're talking to (Contacts), what we're working on (Opportunities).

### Tables

-   Accounts -- companies or customers being sold to.
    -   `Name` (singleLineText, primary)
    -   `Tier` (singleSelect: Enterprise, Mid-Market, SMB, Self-serve) -- adjust to match the user's own segmentation
    -   `Industry` (singleSelect or multipleSelects)
    -   `ARR` (currency) -- annual recurring revenue, where applicable
    -   `Customer health` (singleSelect: Healthy, Watch, At risk, Champion) -- useful for existing customers (renewal motion)
    -   `AE owner` (singleCollaborator)
    -   `CSM owner` (singleCollaborator) -- optional; for post-sale accounts
    -   `Created` (createdTime), `Last activity` (rollup from Activities or lastModifiedTime)
    -   `Opportunities` (multipleRecordLinks -> Opportunities)
    -   `Contacts` (multipleRecordLinks -> Contacts)
-   Contacts -- individuals at accounts.
    -   `Name` (singleLineText, primary)
    -   `Email` (email)
    -   `Phone` (phoneNumber)
    -   `Title` (singleLineText)
    -   `Account` (multipleRecordLinks -> Accounts) -- typically 1 per Contact; multipleRecordLinks for flexibility (consultants / advisors who span accounts)
    -   `Role on deal` (multipleSelects: Champion, Economic Buyer, Decision Maker, Influencer, User, Detractor)
    -   `Source` (singleSelect: Inbound web, Outbound, Referral, Event, Partner, LinkedIn, Other)
    -   `Created` (createdTime), `Last contacted` (date)
-   Opportunities -- deals in motion.
    -   `Name` (singleLineText, primary) -- usually `[Account] [product/scope]`
    -   `Account` (multipleRecordLinks -> Accounts)
    -   `Stage` (singleSelect: Discovery, Qualification, Proposal, Negotiation, Closed-Won, Closed-Lost) -- color-code by progress
    -   `Amount` (currency)
    -   `Probability` (number, percent)
    -   `Expected revenue` (formula = `{Amount} * {Probability} / 100`)
    -   `Expected close` (date)
    -   `Owner` (singleCollaborator)
    -   `Lead source` (singleSelect: Inbound, Outbound, Referral, Partner, Event, Other)
    -   `Stage entered at` (date -- populated by automation when Stage changes)
    -   `Days in current stage` (formula = `DATETIME_DIFF(TODAY(), {Stage entered at}, 'days')`)
    -   `Loss reason` (singleSelect: Pricing, Lost to competitor, Lost to status quo, Timing, No decision, Product gap, Other) -- populate when Stage = Closed-Lost
    -   `Linked contacts` (multipleRecordLinks -> Contacts)
    -   `Last activity` (date or rollup from Activities)

### Variants

-   Inbound-heavy variant -- add a Leads table separate from Opportunities. Leads are pre-qualified; Opportunities are post-qualification. Conversion via automation when `Lead.Status = Qualified`. Common when web-form lead volume is 100+/month.
-   CRM-augmenting variant -- if the user has Salesforce / HubSpot, the three tables become read-only synced tables; native Airtable tables (Deal Desk, Reference DB, etc.) live alongside. See CRM-augmentation shape below.
-   Vertical variant -- see `vertical-shapes.md` for brokerage / real estate / mortgage / insurance / etc.

### Views and interfaces to hand off

-   Kanban on Opportunities grouped by Stage -- the default sales pipeline view
-   Grid view: "Stalled deals" (Days in current stage > 30 AND Stage ≠ Closed-Won, Closed-Lost)
-   Calendar view on Opportunities keyed by Expected close
-   Form view on Contacts (or Leads if present) for inbound intake
-   Interface page: "Account 360" (Record review layout) -- one Account with linked Contacts and Opportunities; pricing-ready single-record surface for sales reps prepping a call
-   Interface page: "Pipeline dashboard" (Dashboard layout) -- sum of `Expected revenue` by quarter and by owner via Chart components, kanban of open opportunities via the Kanban component

## Mid (5-6 tables)

For 10-50 person teams running their own CRM end-to-end. The 3-table shape plus Activities, separate Leads (when inbound volume warrants), and a Stage configuration table (so stages are editable as records, not as singleSelect choices that require schema edits).

### Tables added on top of the 3-table shape

-   Activities -- calls, meetings, emails, notes. Track every interaction.
    -   `Name` (singleLineText, primary) -- usually `[Type] with [Contact] on [Date]`
    -   `Type` (singleSelect: Call, Meeting, Email, Note, Slack, Demo, Discovery, Negotiation)
    -   `Contact` (multipleRecordLinks -> Contacts)
    -   `Account` (multipleRecordLinks -> Accounts) -- auto-populated via formula or automation from Contact
    -   `Opportunity` (multipleRecordLinks -> Opportunities)
    -   `Owner` (singleCollaborator)
    -   `Start at` (dateTime) -- meeting / call start; dateTime (not date) so Duration computes a real end timestamp
    -   `Duration (min)` (number)
    -   `End at` (formula = `DATEADD({Start at}, {Duration (min)}, 'minutes')`) -- needed for Timeline view + Timeline Interface component to render duration bars rather than single-point markers
    -   `Summary` (multilineText)
    -   `Outcome` (singleSelect: Positive, Neutral, Stalled, Negative, Next step set)
    -   `Next action` (singleLineText), `Next action date` (date)
    -   `Created` (createdTime)
-   Leads -- pre-qualification intake (when inbound volume warrants separation from Contacts).
    -   `Name` (singleLineText, primary)
    -   `Email` (email), `Phone` (phoneNumber)
    -   `Company` (singleLineText)
    -   `Title` (singleLineText)
    -   `Source` (singleSelect: Web form, Event, Inbound email, Outbound list, Referral, Partner, LinkedIn, Other)
    -   `Status` (singleSelect: New, Working, Qualified, Converted, Disqualified)
    -   `Score` (number) -- calculated by automation based on Source + interactions
    -   `Assigned to` (singleCollaborator) -- round-robin via automation
    -   `Disqualification reason` (singleLineText)
    -   `Converted to contact` (multipleRecordLinks -> Contacts) -- populated by automation on Status = Converted
    -   `Created` (createdTime), `Last touched` (date)
-   Stages (optional) -- pipeline-stage configuration as records.
    -   `Stage name` (singleLineText, primary)
    -   `Sequence` (number)
    -   `Default probability` (number, percent)
    -   `Required fields` (multipleSelects) -- for the conditional handoff guard pattern
    -   `Description` (multilineText) -- what qualifies a deal at this stage

### Rollup additions

-   On Accounts: `Open opportunity count` (count), `Total expected revenue` (rollup `Opportunities.Expected revenue` where Stage ≠ Closed-\*), `Total ARR` (sum of Opportunities.Amount where Stage = Closed-Won within the current period), `Last activity date` (rollup max from Activities)
-   On Opportunities: `Activity count` (count of Activities), `Days since last activity` (formula), `Days in stage` (formula based on `Stage entered at`)

### Variants

-   B2B variant -- strong territory / segment / vertical fields on Accounts; ARR rollup central; tier-based prioritization.
-   Consumer variant -- collapse Accounts; Leads -> Contacts -> Opportunities directly. Lead scoring via interaction-count thresholds.
-   Mixed (B2B2C) variant -- both shapes coexist; Accounts holds the B2B side; a separate Customers table holds the consumer side.

### Views and interfaces to hand off

-   Activity board: Timeline view on Activities, Start = `Start at`, End = `End at`, grouped by Owner -- duration bars render correctly when `Start at` and `End at` are both populated
-   Pipeline forecast (Dashboard layout): Pivot Table showing Expected revenue by quarter × owner × tier. Pivot Tables are Dashboard-only and desktop-only -- on mobile, fall back to a grouped grid view of the same fields.
-   Stage configuration interface (List layout) -- for sales managers to tweak stage definitions; inline editing if permissions allow
-   Lead triage view: Leads filtered to Status = New, grouped by Source (base grid view)
-   Daily standup interface (List layout or Dashboard with a List section): Activities from yesterday + Next actions due today, per owner

## CRM-augmentation (alongside Salesforce / HubSpot)

The dominant shape at 50+ person sales orgs. Synced Accounts / Contacts / Opportunities from the CRM (read-only) live alongside native Airtable tables for what the CRM doesn't model well.

### Synced tables (read-only from Salesforce / HubSpot)

Set up via the native sync wizard (Salesforce / HubSpot integration). See `references/integrations.md` for the per-CRM framework (Salesforce native sync, Salesforce Automation Actions for write-back, HyperDB sync for very-large datasets, REST API fallback, MCP) and look up current sync cadence, row / column limits, plan-tier gating, and supported field types at execution time.

-   Accounts (synced) -- Account / Contact / Opportunity data from CRM. One-way into Airtable on the native sync path. Use Salesforce reports (or HubSpot equivalent) as the sync source for filtered subsets -- pick the report's filter carefully because filter changes in the source delete corresponding Airtable records.
-   Contacts (synced)
-   Opportunities (synced)

### Native Airtable tables (for what the CRM doesn't model)

-   Deal Desk requests -- pricing exceptions, partner exception requests, custom term requests.
    -   `Request name` (singleLineText, primary)
    -   `Opportunity` (multipleRecordLinks -> Opportunities synced) -- link to the SFDC opportunity
    -   `Request type` (singleSelect: Pricing exception, Partner exception, Custom terms, Discount override, Legal review, Other)
    -   `Requested by` (singleCollaborator)
    -   `Amount impact` (currency)
    -   `Justification` (multilineText)
    -   `Approver` (singleCollaborator) -- assigned by automation based on Amount + Request type
    -   `Status` (singleSelect: Submitted, Under review, Approved, Approved with conditions, Rejected, Withdrawn)
    -   `Decision` (multilineText) -- approver's response
    -   `Decided at` (date)
    -   `SLA due` (formula or date) -- for audit / accountability
-   Reference DB -- customer reference / advocacy database.
    -   `Account` (multipleRecordLinks -> Accounts synced)
    -   `Reference type` (multipleSelects: Logo rights, Case study, Reference call, Quote, Press, Webinar speaker, Event speaker)
    -   `Reference clause source` (singleLineText) -- contract clause granting rights
    -   `Rights granted` (multipleSelects: Logo display, Public case study, Press quote, Reference call, Speaker / webinar)
    -   `Constraints` (multilineText) -- restrictions (no-naming clauses, embargo dates, etc.)
    -   `Last used` (date)
    -   `Use log` (multipleRecordLinks -> Use log records)
    -   `Owner` (singleCollaborator) -- relationship owner who can authorize use
-   Sales engineering allocation -- SE capacity and assignment tracking.
    -   `SE` (singleCollaborator)
    -   `Opportunity` (multipleRecordLinks -> Opportunities synced)
    -   `Hours allocated` (number)
    -   `Stage entered at` (date)
    -   `Technical-win flag` (checkbox)
    -   `Technical-win date` (date)
    -   `Risk status` (singleSelect: Green / Yellow / Red -- RAG status)
    -   `Notes` (multilineText)
-   Activity sync back -- activities logged in Airtable that need to push back to SFDC.
    -   `Activity` (multipleRecordLinks -> native Activities table)
    -   `Push status` (singleSelect: Pending, Sent, Failed, Skipped)
    -   `SFDC activity ID` (singleLineText) -- populated after push
    -   `Last push attempt` (lastModifiedTime)

### Automation patterns

-   Bi-directional write-back via Salesforce Automation Actions: when a critical field changes in Airtable (e.g., Stage moves on a SFDC-synced opportunity that the team is now treating as authoritative in Airtable), an Airtable Automation step uses the native Salesforce action (Create record or Update record) to push back to SFDC. This is a first-party native feature inside Airtable Automations -- no custom REST API code required. See `references/integrations.md#salesforce` for the lookup framework and supported objects.
-   Deal Desk routing: when a Deal Desk request is submitted with a defined `Amount impact` threshold, route to the matching approver tier (manager / VP Sales / CRO / etc.); Slack notification to approver. Adjust thresholds to the user's org structure.
-   Reference DB usage logging: when an AE references a customer, log to the Reference DB's Use log automatically (from interface form or Slack command); rollup count per Account to detect over-asking.
-   SE capacity rollup: per-SE `Hours allocated this quarter` rollup; surfaces in capacity-planning interface.

### Variants

-   Read-mostly UI / license-reduction variant -- Airtable serves as the primary UI for stakeholders who can't justify per-seat CRM costs. Airtable shows synced CRM data; reads-only for the stakeholder audience; writes happen in the CRM by the rep audience. Common at orgs with broad stakeholder audiences (execs, finance, marketing, ops) above a smaller licensed-rep audience.
-   Pre-CRM staging variant -- Airtable as the dirty-data staging layer. Inbound leads from web forms / partner CSVs / enrichment land in Airtable; an Automation evaluates qualification rules and pushes only the qualified records to the CRM via Salesforce Automation Actions (for SFDC) or REST API (for HubSpot / others). The CRM stays clean; the messy work happens in Airtable.

### Views and interfaces to hand off

-   Deal Desk triage interface (List layout with current-user Filter element) -- Deal Desk requests grouped by Status, filtered to "needs my approval"
-   Reference DB browse interface (List layout with Filter element) -- Accounts with reference type / rights / constraints -- AE-facing for self-serve reference lookup
-   SE capacity dashboard (Dashboard layout) -- Hours by SE × quarter via Pivot Table, technical-win rate via Number component, RAG status board via grouped List section
-   License-reduction read-mostly interface (Record review layout) -- Account 360 / Opportunity 360 surfaces with sync-only Opportunity data

## AI-native lean stack

For AI-forward startups deliberately choosing Airtable + AI tooling instead of Salesforce + add-ons. The customer is typically tech-native, AI-leaning, and skeptical of legacy CRM bloat. Airtable becomes the data substrate where Clay-style enrichment, AI account briefs, AI-drafted outbound, and AI MEDDIC extraction all live natively -- typed records + AI Field Agents + Automations + REST API replacing the traditional CRM + AI add-on layers.

### Distinctive elements

-   No traditional CRM by design -- the org has chosen not to adopt Salesforce / HubSpot; Airtable IS the system of record
-   AI Field Agents heavily used -- enrichment, account research, MEDDIC extraction, draft generation all delegated to AI within the data layer
-   Waterfall enrichment -- try one source, fall back to another, all expressed in Airtable formulas + Automations
-   Copilot, not autonomous -- every outbound draft, every account brief, every classification has a human review step
-   Heavy use of REST API -- the team treats Airtable as a programmable data layer, not just a UI tool

### Tables (on top of the mid 5-6-table shape)

-   Enrichment runs -- per-record enrichment attempts with source-by-source results.
    -   `Run ID` (formula or autoincr)
    -   `Subject record` (multipleRecordLinks -> Accounts or Contacts)
    -   `Subject type` (singleSelect: Account, Contact, Lead)
    -   `Sources attempted` (multipleSelects: LinkedIn, Apollo, ZoomInfo, Web research, Crunchbase, PitchBook, Custom-data-provider) -- adjust to the user's enrichment provider set
    -   `Source that succeeded` (singleSelect -- first source to return usable data)
    -   `Confidence` (singleSelect: High, Medium, Low)
    -   `AI extracted summary` (multilineText -- fed by an AI Field Agent)
    -   `Field updates applied` (multilineText -- log of which fields the run actually overwrote)
    -   `Run status` (singleSelect: Pending, In progress, Succeeded, Partial, Failed)
    -   `Cost / credits used` (number -- when the provider is credit-priced)
    -   `Triggered by` (singleSelect: New record, Stale data threshold, Manual)
    -   `Created` (createdTime)
-   Outbound drafts -- AI-generated per-recipient outbound queued for human review.
    -   `Recipient` (multipleRecordLinks -> Contacts)
    -   `Channel` (singleSelect: Email, LinkedIn, Multi-channel sequence)
    -   `Subject` (singleLineText -- for email)
    -   `Body` (multilineText -- AI-generated)
    -   `Personalization notes` (multilineText -- what the AI used as context: news / role change / mutual connections)
    -   `Reviewer` (singleCollaborator) -- who needs to approve before send
    -   `Status` (singleSelect: AI draft, Under review, Approved, Edited, Sent, Skipped)
    -   `Sent at` (date) -- populated by automation on send
    -   `Outcome` (singleSelect: No response, Replied, Meeting booked, Opted out, Bounced)
    -   `Linked sequence` (multipleRecordLinks -> Sequences if the team runs structured sequences)
-   Conversation transcripts (when Granola / Gong / Fathom is in place) -- synced calls flowing into Airtable for AI processing.
    -   `Meeting` (singleLineText, primary)
    -   `Date` (dateTime)
    -   `Account` (multipleRecordLinks -> Accounts)
    -   `Opportunity` (multipleRecordLinks -> Opportunities)
    -   `Attendees` (multipleRecordLinks -> Contacts)
    -   `Transcript URL` or `Transcript text` (URL or multilineText)
    -   `AI extracted MEDDIC` (multilineText -- AI Field Agent output, field-by-field)
    -   `Risk signals` (multipleSelects: Competitor mention, Champion change, Timeline slip, Pricing pushback)
    -   `Next steps extracted` (multilineText)
    -   `Confidence` (singleSelect -- applied by the AI to its own output)
-   AI brief queue (optional -- when teams want a structured AI-account-brief workflow) -- pre-meeting briefs queued for AE consumption.
    -   `Account` (multipleRecordLinks -> Accounts)
    -   `Meeting date` (dateTime)
    -   `Brief` (multilineText -- AI-generated)
    -   `Source recency` (singleSelect: <24h, <1 week, Stale)
    -   `Reviewer` (singleCollaborator)
    -   `Status` (singleSelect: Generating, Ready, Used, Stale)

### Automation patterns

-   Waterfall enrichment chain: on new Account record, kick off an Automation that calls Source A's API (e.g., the team's primary enrichment provider) via REST API; if response is empty or low-confidence, retry with Source B; if still empty, fall back to AI Field Agent web research. Each attempt logs to Enrichment runs.
-   Stale-data refresh: scheduled Automation surfaces Accounts whose enrichment is older than the freshness threshold (e.g., 90 days); re-runs the waterfall on them.
-   AI account-brief generation: 24h before a meeting on the calendar (synced from Google Calendar / Outlook), AI Field Agent aggregates Account + recent Activities + LinkedIn signals + recent news into a brief; lands in AI brief queue.
-   AI MEDDIC extraction on transcript ingestion: when a Conversation transcript record is created, AI Field Agent extracts MEDDIC fields; updates the linked Opportunity (or surfaces the extracted fields for human approval first, depending on team confidence).
-   AI draft generation for outbound: when a record meets sequence-trigger conditions (new lead with score > threshold, stalled deal needing re-engagement, etc.), AI Field Agent generates a per-recipient draft; lands in Outbound drafts queue for human review.
-   Send via integration: on Outbound draft status moving to Approved, Automation pushes to the team's send infrastructure (Outreach / Salesloft / SendGrid / direct Gmail API) via REST API.

### Variants

-   Pure-Airtable variant -- no external enrichment provider; AI Field Agents do all the heavy lifting via web research + LinkedIn. Suits very early-stage teams.
-   Provider-augmented variant -- AI Field Agents complement one external provider (Apollo, ZoomInfo, or similar). Most common at funded startups.
-   Multi-provider waterfall -- full Clay-equivalent with 3-5 sources tried in priority order. For teams that have outgrown a single provider's coverage.
-   With CRM-sync variant -- for teams that DO have Salesforce / HubSpot but are layering AI-native workflows on top; combine with the CRM-augmentation shape above.

### Critical design constraints

-   Always human-in-the-loop for outbound send. The validated market pattern is AI-drafts -> human-review -> send, not autonomous send. Fully autonomous AI SDR tools have shown high customer churn; the copilot pattern sticks.
-   AI confidence as a first-class field. Every AI-generated output should carry a confidence indicator the human reviewer can sort by. Low-confidence outputs need stricter review.
-   AI cost / token budget tracking. AI Field Agent runs cost money; surface per-record and per-day cost rollups so the team can manage spend.
-   Approved-vendor LLM constraints. If the team has constraints (Gemini-only enterprise, on-prem only), confirm before recommending Claude / OpenAI Field Agents specifically.

### Views and interfaces to hand off

-   AI draft review queue Interface (List layout) -- outbound drafts grouped by Reviewer, sortable by AI confidence. Verify List layout's grouping behavior on `singleCollaborator` fields before scaffolding -- `support.airtable.com/docs/list-view-overview` is the authoritative current doc.
-   Enrichment run history Interface (List layout) -- per-record runs with success / failure / cost rollups
-   Conversation insights Interface (Record review layout) -- recent transcripts with extracted MEDDIC and risk signals on each record
-   AI brief queue Interface (List layout) -- pre-meeting briefs for the next 24-48 hours, sortable by meeting time

## Enterprise multi-base augmentation

Hub-and-spoke architecture for large orgs with multiple sales squads / regions / programs that need both per-team autonomy AND org-level rollups.

### Pattern

-   Central hub base -- Accounts (master), Contacts (master), Reference DB, shared Deal Desk, executive dashboards.
-   Per-region or per-program spoke bases -- Opportunities, Activities, region/program-specific tables. Each spoke owns its own pipeline.
-   2-way sync between hub and spokes -- hub Accounts ↔ spoke Accounts (so each spoke sees the right accounts); spoke Opportunities -> hub Opportunities (so executive rollup is possible).
-   Row-level permissions via Interfaces -- reps see only their own deals; managers see their region's deals; executives see the full rollup.

### Hub table additions on top of the CRM-augmentation shape

-   Hub Accounts -- master account directory.
    -   `Account name` (singleLineText, primary)
    -   `Owning region` (singleSelect: NA / EMEA / APAC / LATAM / etc.)
    -   `Owning program` (multipleRecordLinks -> Programs if applicable)
    -   `Account tier` (singleSelect)
    -   `Spoke base IDs` (multilineText or URL field) -- links to the spoke base where this account's opportunities live
    -   `Deep link to spoke record` (formula) -- URL pointing to the relevant spoke base
-   Programs / Squads / Regions (depending on org structure) -- defines the spokes.
    -   `Name` (singleLineText, primary)
    -   `Spoke base URL` (URL)
    -   `Lead` (singleCollaborator)
    -   `Members` (multipleCollaborators)
    -   `Accounts assigned` (rollup or multipleRecordLinks -> Hub Accounts)

### Spoke base shape

Each spoke is a CRM-augmentation shape (or a mid shape if the spoke runs its own CRM rather than augmenting). Spokes sync Accounts from the hub via the hub's published share link, and push Opportunities back to the hub via cross-base sync.

### Automation patterns

-   Hub -> spoke account sync: when a new account is created in the hub and assigned to a region, an Automation creates a corresponding record in the spoke base
-   Spoke -> hub opportunity rollup: when an opportunity reaches `Stage = Closed-Won` in a spoke base, push a summary record to the hub for executive rollup
-   Email-based dedupe across spokes: when a contact appears in multiple spoke bases (e.g., a global account contact), Automation flags duplicates via email match for stewardship reconciliation
-   URL formula generating deep-link to a record in a program-specific spoke base from hub -- lets executives drill from the hub rollup to the spoke's source record

### Views and interfaces to hand off

-   Executive rollup interface (Dashboard layout) -- full org pipeline grouped by Region / Program / Stage / Quarter via Pivot Tables + Charts
-   Region-specific interface (List or Dashboard layout, read-only across other regions) -- per-region pipeline, accounts, top deals; use Interface-level permissions for the cross-region restriction
-   Account 360 hub interface (Record review layout) -- Account record with deep-links to spoke-base Opportunities
-   Cross-region deal review interface (List layout) -- for global accounts spanning multiple regions

## Specialized shapes (surface on demand)

These are distinct product surfaces, NOT just larger CRM shapes. Surface only when scope answers indicate them.

### Deal Desk hub (standalone)

Distinct from CRM augmentation -- a request-routed approval workflow for Deal Support Requests (DSRs), pricing exceptions, partner exception requests, custom terms.

Tables:

-   DSR requests -- `Request type`, `Opportunity link`, `Requester`, `Amount impact`, `Justification`, `Approver`, `Status`, `Decision`, `Audit notes` (for SOX), `SLA due`, `Decided at`
-   Approvers -- `Approver`, `Approval scope` (singleSelect: Pricing < $10k / Pricing $10-50k / Pricing > $50k / Custom terms / Legal review / etc.), `Active`, `Backup approver`
-   Approval audit trail -- `Request`, `Approver`, `Decision`, `Decision date`, `Comment`, `Conditions`

Automations: route by Amount + Request type to matching Approver scope; SLA tracking; escalation if SLA missed; audit-trail append-only.

### Customer reference / advocacy database (standalone)

Table:

-   References -- `Account`, `Reference type`, `Rights granted`, `Constraints`, `Last used`, `Use log`, `Relationship owner`, `Contract clause source` -- see CRM-augmentation shape above for the field set.
-   Use log -- `Reference`, `Used by`, `Used for` (singleSelect: Sales pitch / Marketing / Press / Event / Other), `Used at`, `Approval needed?` (checkbox), `Approved by`

Patterns: reference rights synced from Salesforce contract clauses; over-asking rollup per Account; AE self-serve interface to find matching references.

### Sales engineering activity & capacity tracking

Tables:

-   SE allocations -- `SE`, `Opportunity`, `Hours allocated`, `Hours actual`, `Technical-win flag`, `Risk status (RAG)`, `Stage entered at`, `Notes`
-   SE capacity per quarter -- `SE`, `Quarter`, `Person-days available`, `Person-days committed` (rollup), `Utilization` (formula)
-   SE recruiting pipeline (optional) -- `Candidate`, `Status`, `Open req`, `Owner`

### Sales bookings forecast (rep-level row permissions)

Tables:

-   Forecast lines -- `Rep`, `Quarter`, `Commit`, `Best case`, `Pipeline`, `Closed`, `Snapshot date`
-   Quotas -- `Rep`, `Quarter`, `Quota amount`, `Comp plan` (linked to a Comp plans table)
-   Monthly snapshots -- `Snapshot date`, `Rep`, all forecast fields -- gives moving-average / historical trending without duplicating tables per filter

Patterns: row-level permissions via Interfaces so reps see only their lines; managers roll up region/team; executives see org-level.

### RFP / tender pipeline with pre-bid intelligence

Tables:

-   Opportunities (tender-shaped) -- `Tender name`, `Issuing body`, `Stage` (Pre-bid / Bid / Awaiting decision / Won / Lost), `Pursuit tier` (A/B/C -- competitive strength), `Go/no-go decision`, `Bid value`, `Bid effort (person-days)`, `Submission deadline`, `Decision date`
-   Stakeholders -- pre-bid intelligence: project owners, design consultants, decision committee members, past relationships
-   Bid components / line items -- for multi-line tender responses with pricing
-   Win/loss analysis -- `Opportunity`, `Outcome`, `Loss reason`, `Winning competitor`, `Pricing learnings`

Patterns: pre-bid intelligence triage; go/no-go decision discipline with win-rate by tier; capture vs. pursue framing.

## Choosing between shapes

If the answers to the scope questions don't obviously map to one shape, lean smaller -- it's easier to add tables than to strip them.

When in doubt:

-   Default to lightweight / 1-2 table for solo founders or 2-3 person teams with no formal sales function
-   Default to solo / small / 3-table for under-10-person teams without an existing CRM
-   Default to mid / 5-6 table for 10-50 person teams running their own CRM end-to-end
-   Default to CRM-augmentation when the user has Salesforce / HubSpot AND has more than 20 reps
-   Default to enterprise multi-base augmentation when the user has Salesforce / HubSpot AND has multiple regions or programs needing both autonomy and rollup
-   Surface vertical shapes (in `vertical-shapes.md`) when the user's language signals a specific industry
-   Surface specialized shapes (Deal Desk, Reference DB, SE capacity, Sales bookings forecast, RFP/tender) when the user names them or describes a workflow that maps to them
