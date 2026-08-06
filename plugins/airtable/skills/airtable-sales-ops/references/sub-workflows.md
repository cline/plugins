# Work-mode sub-workflow playbooks

Operational detail for the Work-mode sub-workflows named in `SKILL.md`. Load the section that matches the user's invocation; don't read the whole file.

These assume the base already exists. For scaffolding a new base, see `schema-shapes.md` and `vertical-shapes.md`.

## 1. Pipeline triage and stage progression

The most common Work-mode invocation. User wants help moving deals forward, identifying stalled deals, or cleaning up pipeline hygiene.

### Trigger phrases

_"Triage this week's pipeline"_, _"find stalled deals"_, _"what's slipping this quarter"_, _"show me deals that need attention"_, _"clean up old pipeline records"_.

### Playbook

1. Identify the pipeline scope -- owner, segment, time-period, or stage subset. Use `airtable-filters` to construct the query.
2. Surface stalled deals first -- filter `Days in current stage > 30` AND `Stage ∉ {Closed-Won, Closed-Lost}`. These are the highest-leverage records to act on. Sort by `Days in current stage` descending.
3. Surface slipping deals -- filter `Expected close < TODAY()` AND `Stage ≠ Closed-Won` AND `Stage ≠ Closed-Lost`. These need a new expected-close date or a stage update.
4. Surface missing-data records -- filter `Stage ≠ Closed-* AND (Amount empty OR Probability empty OR Next action empty)`. Hygiene issue; AE needs to fill in.
5. Update via MCP -- for each stalled / slipping deal the user wants to act on, update `Stage`, `Next action`, `Next action date`, `Notes` via `update_records_for_table`. Confirm with the user before bulk updates.
6. Hand off via `airtable-link` -- link to the filtered triage view (Kanban or grid) so the user can see the post-triage state.

### Schema fields used

`Stage`, `Stage entered at`, `Days in current stage` (formula), `Expected close`, `Amount`, `Probability`, `Next action`, `Next action date`, `Owner`.

### Variants

-   Manager review variant: roll up the triage findings as "deals to discuss" per rep -- output a per-rep summary the manager can use for 1:1s.
-   Forecast risk variant: pair with the forecast review playbook below; surface deals that are dragging down forecast accuracy.

## 2. Lead routing and assignment

Inbound lead triage and AE / SDR assignment. Often automated via Airtable Automations, but agents can score / classify / route manually when automation isn't set up or volumes are low.

### Trigger phrases

_"Route these inbound leads"_, _"score these leads"_, _"assign this week's intake"_, _"who should follow up on this list"_.

### Playbook

1. Identify unassigned / unscored leads -- filter `Status = New` AND (`Assigned to` empty OR `Score` empty).
2. Score based on Source + interactions + ICP fit:
    - Inbound web form with company email + title fields populated -> higher score
    - Outbound list import -> lower score
    - Referral from existing customer -> highest score
    - Multiple interactions across forms / LinkedIn / events -> boost score
3. Classify by ICP fit -- based on Company size, Industry, Title, Region. Use account-level data if Account is already linked.
4. Route via round-robin or rule-based assignment:
    - Round-robin: `Assigned to` cycles through a defined pool of SDRs/AEs by territory or product
    - Rule-based: Enterprise / named accounts -> named AE; SMB inbound -> SDR pool; etc.
5. Notify the assignee -- Slack DM via Automation, or pass the assignee a summary the user can forward.
6. Hand off via `airtable-link` -- link to the newly-assigned leads filtered to the assignee.

### Schema fields used

`Status`, `Source`, `Score`, `Assigned to`, `ICP fit`, `Created`, `Last touched`.

### Variants

-   Slack-bot variant: if the user has a Slack-based intake bot, leads land in Airtable with the Slack message context populated. The playbook adds: extract company/title from the Slack context if not already populated.
-   High-velocity variant: when inbound volume is large enough to justify it, tighten the automation chain so lead-to-first-touch happens within minutes -- Slack notification -> SDR DM with a "claim this lead" interface button.

## 3. Forecast review

Roll up pipeline to a forecast number; identify forecast risk; export to BI.

### Trigger phrases

_"What's my Q3 forecast"_, _"forecast review"_, _"how's the quarter looking"_, _"pipeline coverage for next quarter"_, _"prep the QBR forecast"_.

### Playbook

1. Identify the forecast period -- current quarter, next quarter, FY, custom window.
2. Filter opportunities to `Expected close` within the period AND `Stage ∉ {Closed-Lost}`.
3. Roll up by:
    - Owner (rep): sum of `Expected revenue` (= Amount × Probability)
    - Tier / Segment: sum by Account.Tier
    - Region: sum by Account.Region
    - Stage: sum by Stage to show the funnel shape
4. Compute pipeline coverage: `Total expected revenue / Quota for the period`. Healthy coverage is 3-5x quota.
5. Compute forecast accuracy (if historical data exists): for closed periods, compare predicted forecast at the start of the period to actual closed-won. Surface the gap as a calibration signal.
6. Identify forecast risk:
    - Stage = Negotiation / Proposal opportunities slipping past expected close
    - Large opportunities with stale `Last activity` (no touch in 30+ days)
    - Enterprise / top-tier accounts with low pipeline coverage relative to their target
7. Snapshot for trending (if a snapshot table exists): write the current rollup to the monthly snapshots table for historical comparison.
8. Hand off via `airtable-link` -- link to the forecast dashboard interface or grid.

### Schema fields used

`Opportunities.Amount`, `Opportunities.Probability`, `Opportunities.Expected close`, `Opportunities.Stage`, `Opportunities.Last activity`, `Accounts.Tier`, `Accounts.Region`, `Quotas.Quota amount` (if a quota table exists).

### Variants

-   Probability-weighted vs. commit / best-case / pipeline variant: some teams report three numbers -- Commit (high-confidence), Best case (stretch), Pipeline (all open). Use a snapshot table to track all three over time.

## 4. Account research and account-brief generation

Gather context across Accounts / Opportunities / Activities / external sources; produce a meeting-prep brief for the AE / CSM.

### Trigger phrases

_"Prep a brief for the [Account] call tomorrow"_, _"account research on [name]"_, _"what's the latest on [Account]"_, _"meeting prep"_.

### Playbook

1. Identify the Account record by name match or record ID.
2. Pull internal context:
    - Account record (Tier, Industry, ARR, Customer health, Owners)
    - All linked Opportunities (Stage, Amount, Last activity)
    - Recent Activities (last 10-30 days; filter by Date desc)
    - Deal Desk requests (if any are open or recently resolved)
    - Reference DB status (any logo / case study rights, last usage)
3. Pull external context (if AI / web-research access is available):
    - LinkedIn updates on Contacts at the Account (job changes, new hires)
    - Recent news mentioning the Account (earnings, funding, exec hires, M&A)
    - Industry signals relevant to the Account
4. Compose the brief -- typical structure:
    - Quick facts -- Tier, ARR, Owners, Health
    - Recent activity -- last 5 interactions with outcomes
    - Open opportunities -- Stage, Amount, Probability, Next action
    - Signals -- external news, LinkedIn changes
    - Open Deal Desk requests -- anything pending approval
    - Suggested next steps -- based on stage progression, last activity, signals
5. Hand off via `airtable-link` -- link to the Account 360 interface or the Account record itself.

### Schema fields used

All Account fields, Opportunity rollups, recent Activities, Deal Desk requests, Reference DB.

### Variants

-   VC / investment deal-brief variant: for VC / PE accounts, the brief includes diligence framework progress (e.g., MEDDIC fields), fund-level fit, exec hire/exit signals, AUM extraction from filings (if AI Field Agent is set up).
-   B2C variant: collapse Accounts -> Customers; recent purchase history; engagement signals from app / web.
-   AI-generated brief variant: if the team has AI Assistant / Omni set up over the base, the brief generation can be one-shotted by the AI Assistant. Surface this as an option if the access permits.

## 5. Renewal pipeline / risk monitoring

Identify accounts approaching renewal; rollup usage / engagement signals; flag at-risk; trigger CSM action. Distinct from raw pipeline; this is the commercial side of post-sale.

### Trigger phrases

_"At-risk renewals"_, _"renewal pipeline"_, _"who's up for renewal in Q4"_, _"churn risk review"_.

### Playbook

1. Identify accounts with upcoming renewals -- filter `Renewal date` within next 60-90-180 days.
2. Pull engagement signals for each Account:
    - Last activity date (rollup from Activities)
    - Open Opportunities (expansion, upsell, cross-sell)
    - Recent Customer health status changes
    - Usage signals if synced from product (e.g., active-user count, feature adoption -- if the team has product analytics in the base)
3. Score risk -- combine signals:
    - `Last activity > 60 days` -> at-risk
    - `Customer health = At risk` -> at-risk
    - `Active-user count declining` -> at-risk
    - `No CSM owner assigned` -> process risk
    - Inverse: high engagement, healthy status, recent positive activity -> likely renewal
4. Trigger CSM action:
    - Update `Customer health` if the signals say so
    - Set `Renewal motion` field (singleSelect: Auto-renew / Confirm / Expansion-focused / Save motion / Disengage)
    - Create renewal tasks linked to the Account (next steps, owner, due date)
5. Roll up risk for executive visibility -- count of at-risk accounts × ARR; total ARR at risk in the next 90 days.
6. Hand off via `airtable-link` -- link to the renewal pipeline interface or at-risk view.

### Schema fields used

`Accounts.Renewal date`, `Accounts.Customer health`, `Accounts.ARR`, `Accounts.CSM owner`, `Last activity`, `Opportunities` (expansion type).

### Variants

-   Usage-overage variant: when overage signals trigger an expansion opportunity (e.g., "this customer used 130% of their seat license this month"), create a linked Expansion opportunity automatically.

## 6. Sales-to-service handoff

Validate Closed-Won opportunities meet required-field thresholds; create downstream records in ops / install / project tables; notify handoff team.

### Trigger phrases

_"Hand off this deal to ops"_, _"trigger the install for [Account]"_, _"validate the Closed-Won queue"_, _"clean up Closed-Won fields"_.

### Playbook

1. Identify Closed-Won opportunities awaiting handoff -- filter `Stage = Closed-Won` AND `Handoff status ≠ Complete`.
2. Validate required fields per the conditional-handoff-guard pattern:
    - PO number populated
    - Final contract amount populated
    - Ship date / install date set
    - Contract attached
    - Account billing contact identified
3. For records that pass validation:
    - Create a downstream record in the ops / install / project table
    - Link the new record to the Opportunity for traceability
    - Notify the handoff team (Slack, email, or task creation)
    - Update `Handoff status` = Complete
4. For records that fail validation:
    - Surface the missing fields to the AE
    - Set `Handoff status` = Blocked, with reason
    - Notify the AE to remediate
5. Hand off via `airtable-link` -- link to the Closed-Won queue with the post-handoff status.

### Schema fields used

`Opportunities.Stage`, custom validation fields (`PO number`, `Final amount`, `Ship date`, `Billing contact`), `Handoff status`, linked record to downstream ops table.

### Variants

-   Multi-team handoff variant: handoff splits across multiple teams (e.g., Implementation + Finance + Legal + Customer Success). Each team gets its own downstream record. The Opportunity tracks handoff status per team.

## 7. Deal desk review

Triage Deal Support Requests (DSRs) / pricing exceptions / partner exception requests; route to approvers; track approval state.

### Trigger phrases

_"What's in the deal desk queue"_, _"approve this pricing exception"_, _"deal desk review"_, _"who needs to sign off on [request]"_.

### Playbook

1. Identify open DSRs -- filter `Status ∈ {Submitted, Under review}`.
2. Validate the request fields are complete: Requested by, Opportunity link, Request type, Amount impact, Justification.
3. Route to the right approver based on `Request type` and `Amount impact`:
    - Pricing exception < $10k -> manager
    - $10-50k -> VP Sales
    - $50-200k -> CRO
    - > $200k -> CEO / CFO
    - Custom terms -> Legal
    - Partner exception -> Partner team lead
4. Track SLA -- flag requests older than the SLA threshold (e.g., 2 business days for pricing, 5 for legal).
5. Surface to approver -- Slack DM via Automation, or filter view "needs my approval" via current-user filter.
6. Record the decision -- Approval / Conditional Approval / Rejection with rationale. Update the Opportunity if approval affects pricing or terms.
7. Append to audit trail -- for SOX compliance, every decision creates an immutable record with timestamp, approver, decision, reasoning.
8. Hand off via `airtable-link` -- link to the Deal Desk interface.

### Schema fields used

`DSR requests.*` (see schema-shapes.md), `Approvers`, `Approval audit trail`.

### Variants

-   Partner-led pipeline variant: partner exception requests follow a different routing (partner team rather than direct sales). Track partner ID and channel program separately.
-   Auto-approval variant: low-risk request types (e.g., discount <= 5% on SMB-tier deals) can auto-approve via formula + automation. Surface this for routine cases; route exceptions to humans.

## 8. Partner / channel CRM ops

Partner pipeline review, channel registration, joint account planning, partner-led pipeline rollup, deal registration approvals.

### Trigger phrases

_"Partner pipeline review"_, _"deal registration"_, _"joint account plan with [Partner]"_, _"channel conflict check"_, _"approve this partner deal reg"_.

### Playbook

1. Identify partner-led opportunities -- filter `Source = Partner` OR linked to a Partner record. Surface separately from direct pipeline.
2. Channel conflict check -- when a partner registers a deal, check whether the account is already in direct pipeline. Flag conflicts to the channel manager.
3. Joint account planning -- for top accounts being co-sold with a partner, pull a joint Account 360 view that shows both direct activities and partner activities (if the partner has access to update the base).
4. Deal registration approval -- partner-submitted deal regs need approval (e.g., the partner gets discount protection if approved). Route to channel team for approval.
5. Partner-led pipeline rollup -- sum partner-led opportunities by Partner, Stage, Amount. Useful for partner QBRs.
6. Hand off via `airtable-link` -- link to partner-specific interface, or filter view "Pipeline from [Partner X]".

### Schema fields used

`Opportunities.Source`, `Opportunities.Partner`, `Partners` (linked table), `Deal registrations`, `Channel conflict status`.

### Variants

-   External-collaborator variant: partners log into Airtable directly to update their pipeline (via Interface page with restricted permissions). Distinct from internal partner CRM where the partner team owns the records. Common when partners are external organizations that need direct write access without buying Airtable seats.
-   Multi-tier partner variant: distributors, resellers, system integrators all in one Partners table with tier / type fields. Different deal-reg policies per tier.

## 9. RFP / tender pipeline ops

Pre-bid intel triage, go/no-go decision tracking, bid submission status, win-rate analysis. Common in AEC / public works / enterprise B2B / government contracts.

### Trigger phrases

_"RFP triage"_, _"go/no-go on this tender"_, _"win rate by pursuit tier"_, _"pre-bid pipeline review"_, _"who's bidding what this week"_.

### Playbook

1. Identify open RFPs / tenders -- filter `Stage ∈ {Pre-bid, Bid, Awaiting decision}`.
2. Triage pre-bid intelligence -- for each pre-bid record, surface:
    - Issuing body and decision committee members (from Stakeholders table)
    - Past relationship strength (rollup from Activities, prior won/lost tenders with this issuer)
    - Pursuit tier (A/B/C) -- competitive strength assessment
3. Go/no-go decision -- for pre-bid records nearing submission deadline, surface go/no-go criteria:
    - Pursuit tier >= B (only respond to tier-A and tier-B by policy)
    - Bid effort vs. expected value (cost / value ratio)
    - Strategic fit
    - Win probability
4. Track bid submissions -- record the submission date, bid value, bid effort (person-days invested), submission attachments.
5. Win-rate analysis -- for resolved tenders, compute win rate by Pursuit tier, by Issuing body, by Industry. Surface to leadership for pursuit-policy refinement.
6. Hand off via `airtable-link` -- link to the tender pipeline interface or win-loss dashboard.

### Schema fields used

`Opportunities.Stage` (tender-shaped), `Pursuit tier`, `Bid value`, `Bid effort`, `Submission deadline`, `Go/no-go decision`, `Stakeholders`, `Win/loss analysis`.

### Variants

-   Public-sector variant: federal / state / city contract bidding has additional compliance requirements (set-asides, registration codes, prevailing wage). Add a Compliance Checks table.
-   Pre-RFP pursuit variant: AEC firms often invest in relationships months before the RFP publishes. Track "pursuit" records that pre-date the RFP -- relationship-building activities, signals (CIP updates, grant awards) that suggest an RFP is coming.

## 10. Customer reference / advocacy DB ops

Match customer asks to available references, check rights / permissions / clauses, log usage.

### Trigger phrases

_"Find a reference for this deal"_, _"who can speak at [event]"_, _"check logo rights for [Account]"_, _"reference DB cleanup"_.

### Playbook

1. Receive the reference request -- typically from an AE: industry, size, use-case, urgency, type needed (logo / case study / call / press / speaker).
2. Match references -- filter the Reference DB:
    - `Reference type` includes the requested type
    - `Rights granted` covers the requested use
    - `Industry` matches (if specified)
    - `Last used` is older than the over-asking threshold (e.g., > 30 days for reference calls)
3. Check constraints -- for each matching reference, verify:
    - Constraints field (no-naming clauses, embargo dates)
    - Account's current Customer health (don't ask at-risk accounts)
    - Last usage frequency (don't over-ask)
4. Surface candidates to the AE with: reference type, rights, last used, relationship owner.
5. AE submits use request -- when the AE chooses a reference and the customer agrees, log to Use log with: Used for, Used by, Used at, Result.
6. Update last-used on the Reference record.
7. Hand off via `airtable-link` -- link to the matched references view or Use log entry.

### Schema fields used

`References.*` (see schema-shapes.md), `Use log`.

### Variants

-   Pre-approved reference variant: some references are pre-approved for unlimited use (PR-friendly customers with public case studies). Surface separately for self-serve AE access without owner approval.

## 11. Data enrichment waterfall (Clay-equivalent)

Multi-source enrichment per record with fallback logic, expressed natively in Airtable. Replicates what Clay does -- try one source, fall back to another, backfill via AI web research as final fallback -- without a separate Clay subscription. The same primitives that make Clay work (tables, typed columns, formulas, API calls, AI extraction) are first-party in Airtable.

### Trigger phrases

_"Enrich this list of accounts"_, _"fill in missing data on our contacts"_, _"build a Clay-equivalent in Airtable"_, _"waterfall enrichment"_, _"score these inbound leads with company data"_, _"can Airtable do what Clay does?"_

### Why Airtable can replicate Clay

Clay's core primitives:

-   Tables of records (people / companies) -> Airtable Tables
-   Columns with typed data -> Airtable typed fields
-   Formula columns for derived values -> Airtable formulas
-   API-call columns that hit external data providers per row -> Airtable Automations with REST API calls (or per-record AI Field Agents calling external APIs)
-   AI columns that clean / classify / extract -> Airtable AI Field Agents
-   Waterfall logic (try source A; if empty, try B; if empty, try C) -> Airtable Automations with branching conditions

What Clay adds on top (and what may or may not matter for the user):

-   Out-of-the-box integrations to 150+ data providers -- Airtable typically uses fewer providers via direct REST API + AI Field Agent web research
-   Credit-managed pricing across enrichment providers -- Clay meters provider credits per record per source. Airtable pricing is per-seat with plan-tier limits (records, automation runs, AI credits); enrichment-provider credits come from the user's direct contracts with those providers. Different cost shape, not necessarily cheaper or more expensive -- depends on the user's volume + provider mix.
-   Pre-built waterfall templates -- Airtable's are agent-built per-customer; faster to ship custom logic, slower to copy a generic template

Position honestly: if the user has a small / moderate provider set and wants programmable record-level enrichment, Airtable's native primitives match Clay's. If they need 100+ provider waterfalls or already have Clay deeply embedded in their workflow, integrate via Clay's API or recommend keeping Clay as the dedicated tool.

### Playbook

1. Define the enrichment shape -- what fields need to be enriched, from which sources, in what priority order? E.g., for a Contact: try ZoomInfo first for email + phone; if missing, try Apollo; if missing, AI Field Agent web search; for company size, try Apollo first; if missing, AI extraction from the company's website.
2. Build the Enrichment runs table (see `schema-shapes.md#ai-native-lean-stack`) -- every enrichment attempt logs as a record with source attempted, outcome, confidence, fields applied.
3. Build the waterfall Automation -- chain of branched conditions: call provider A's API; on success, populate fields; on failure or low confidence, branch to provider B; etc. Each branch logs to Enrichment runs.
4. Configure AI Field Agent fallback -- when all explicit providers fail, the final fallback is AI web research (e.g., Field Agent searches LinkedIn + the company's website + recent news to backfill missing fields).
5. Confidence scoring -- populate a Confidence field per enrichment based on the source that succeeded (provider > AI extraction = higher confidence than AI extraction alone).
6. Stale-data refresh schedule -- scheduled Automation re-runs the waterfall on records whose enrichment is older than a freshness threshold (e.g., 90 days).
7. Cost tracking -- log credits used per run; per-day and per-source rollups; surface to a budget dashboard.
8. Hand off via `airtable-link` -- link to the Enrichment runs Interface or the refreshed record set.

### Schema fields used

-   Source-of-truth tables (Accounts, Contacts) -- the enrichment targets
-   `Enrichment runs` table (see `schema-shapes.md#ai-native-lean-stack`)
-   Per-target fields the enrichment populates (Company size, Industry, Revenue band, Email, Phone, Title, etc.)
-   `Last enriched` (date), `Enrichment confidence` (singleSelect), `Enrichment source` (singleSelect)

### Variants

-   Provider-priority variant -- explicit ordered list of providers with budget caps per provider; fall through in order.
-   Confidence-first variant -- call multiple providers in parallel, pick the highest-confidence answer; useful when providers disagree.
-   Trigger-on-demand variant -- enrichment runs only when a record matches conditions (e.g., new inbound lead, account moving to a qualified stage), not on every record.
-   Bulk-backfill variant -- one-time enrichment of an existing book of business; uses bulk Automation runs with rate-limiting to stay within API quotas.

### Stumbling blocks

-   API rate limits -- providers throttle. Build retries with exponential backoff; queue requests; surface throttling to the user.
-   Cost runaway -- credit-priced providers can burn budget fast. Surface daily / weekly cost rollups; cap per-day runs.
-   Quality variance -- AI Field Agent web research will sometimes hallucinate. Confidence scoring + human spot-checks at key fields (e.g., always human-verify Email before adding to a send list) are essential.
-   Stale data refresh churn -- refreshing too aggressively wastes credits; too rarely, data goes stale. 60-90 day refresh cycles are typical, but tune to the user's deal velocity.

## 12. AI-assisted outbound drafts (copilot pattern, not autonomous)

Generate per-recipient outbound drafts using AI Field Agents with account + contact context. Drafts land in a review queue; a human approves (and edits) before send. This is the validated market pattern. The fully-autonomous AI-SDR shape has been harder than it looked in practice -- generic AI-sounding emails, brand-protection concerns, and CAN-SPAM / CASL exposure push teams back toward human-in-the-loop. The copilot pattern (AI drafts -> human review -> send) composes cleanly with the rest of the GTM stack and is what teams are sticking with.

### Trigger phrases

_"Draft outreach to these accounts"_, _"AI-assisted sequences"_, _"AI copilot for our SDRs"_, _"generate personalized cold emails"_, _"set up an AI SDR in Airtable"_ (clarify intent -- the user likely means copilot, not autonomous).

### Playbook

1. Confirm the intent: copilot, not autonomous. If the user says "AI SDR" or "autonomous outbound," surface the market reality: fully autonomous tools have churned heavily; copilot (AI drafts + human review) is the validated shape. Confirm the user wants the copilot pattern before scaffolding.
2. Define the trigger conditions -- which records get AI-drafted outbound, and when? E.g., new inbound leads with ICP score > threshold, stalled deals needing re-engagement, recently-funded accounts in the target industry.
3. Build the Outbound drafts table (see `schema-shapes.md#ai-native-lean-stack`) with `Recipient`, `Channel`, `Subject`, `Body`, `Personalization notes`, `Reviewer`, `Status` (AI draft / Under review / Approved / Edited / Sent / Skipped).
4. Configure AI Field Agent draft generation -- Agent reads recipient context (Account / Contact / recent Activities / linked enrichment data / recent news) and generates a draft. Include the personalization rationale in `Personalization notes` so reviewers can audit.
5. Build the review Interface -- reviewer-facing view that surfaces pending drafts sorted by AI confidence (low confidence reviewed more carefully) and recipient priority. Edits update the Body in place; status moves to Approved / Edited / Skipped.
6. Build the send Automation -- on status moving to Approved or Edited, push to the team's send infrastructure (Outreach / Salesloft / SendGrid / direct Gmail API / Apollo / etc.). Update `Sent at`.
7. Outcome tracking -- log replies, meeting bookings, opt-outs, bounces back to the draft record for retrospective analysis.
8. Hand off via `airtable-link` -- link to the review queue Interface.

### Schema fields used

-   `Outbound drafts` table (see `schema-shapes.md#ai-native-lean-stack`)
-   Linked Contacts, Accounts, Opportunities for context
-   `Sequences` table if the team runs structured sequences (sequence = ordered set of drafts to the same recipient)

### Variants

-   Single-touch variant -- one AI draft per recipient per trigger; reviewer approves or skips. Simplest shape.
-   Sequence variant -- multi-step ordered touches (e.g., Day 0 email, Day 3 LinkedIn, Day 7 follow-up email); AI generates each step's draft with context from prior touches' outcomes; reviewer approves each.
-   Persona-based variant -- drafts are scoped by recipient persona (CFO vs. VP Sales vs. RevOps lead) with different tone / value-prop framing per persona.
-   Re-engagement variant -- drafts for stalled deals or lapsed leads, framed around what changed since last contact (new product feature, news event, time elapsed).
-   Multi-channel variant -- same recipient gets drafts in different channels (email, LinkedIn message, direct social touch); reviewer chooses which to send.

### Critical do-NOTs

-   Don't auto-send AI drafts. Always a human review step. This is the difference between a validated pattern and one of the failed autonomous AI SDR products.
-   Don't lose personalization audit trail. The Personalization notes field is essential -- reviewers need to know what the AI used as context to spot hallucinations.
-   Don't ignore deliverability infrastructure. Airtable can draft, but the actual send infrastructure (sender reputation, warmup, IP rotation, list hygiene, unsubscribe management) belongs in a dedicated send tool (Outreach, Salesloft, Apollo, SendGrid) or carefully-configured Gmail / Outlook integration. CAN-SPAM / CASL compliance is non-negotiable.
-   Don't promise volume. AI-assisted outbound's value is quality + scale of personalization, not raw volume. Reviewer capacity caps daily send.

### Integration anchors

-   Send infrastructure -- Outreach / Salesloft / Apollo / Reply.io / SendGrid / Gmail / Outlook via REST API
-   Enrichment context -- pulls from Enrichment runs table (see sub-workflow #11)
-   Conversation context -- pulls from synced transcripts (Granola / Gong / Fathom) for re-engagement drafts that reference prior conversation themes
-   See `references/integrations.md` for per-tool integration mechanics

## 13. Agent activity log pattern

Opt-in pattern when the user is explicitly building an agent-driven airtable-sales-ops workflow. Owned by the `airtable-agent-activity-log` skill -- compose that skill rather than re-implementing inline. The shared skill holds the canonical disclosure language, schema, schema-design constraint (Airtable `multipleRecordLinks` is single-target, so per-table linked-record fields + URL fallback), and use guidance.

Sales-ops-specific notes for the composition:

-   Tables the agent typically touches (pass these through to `airtable-agent-activity-log` so the per-target linked-record fields are scaffolded for the right tables): Accounts, Contacts, Opportunities, Activities, plus whatever specialized tables the user has (Deal Desk requests, Reference DB, Sales engineering allocations, etc.). The shared skill's per-target linked-record pattern needs one `multipleRecordLinks` field per table; pass the actual table inventory through.
-   Trigger phrases in airtable-sales-ops context: _"audit log of what the agent did,"_ _"agent monitoring our pipeline overnight,"_ _"AI SDR copilot workflow,"_ _"keep a record of every account the agent updated and why."_
-   Hand off via `airtable-link` to the `Agent activity log` table or a per-session view.

## Reference-available sub-workflows (longer tail)

The 12 above cover most invocations. The longer tail of sub-workflows lives here for on-demand loading.

### Whitespace mapping in per-rep workspaces

Per-rep base or Interface synced from SFDC accounts, showing accounts the rep "could be working" but isn't. Useful for AE territory coverage analysis.

### Quarterly sales planning hub

Top-down planning for next-quarter targets by region / segment / vertical. Inputs: Quota plan, Capacity, Top-100 account list. Outputs: assigned named accounts, planned pursuits.

### Mutual Action Plans (MAPs) / deal rooms

Co-selling workspace with the buyer. Shared task list, shared documents, joint milestones. Frequently asked for; rarely shipped at production quality. Can be scaffolded on top of an Opportunity:

-   MAP entries -- `Opportunity`, `Milestone`, `Owner (internal)`, `Owner (buyer)`, `Due date`, `Status`, `Notes`
-   MAP documents (attachment field or linked Documents table)
-   Public-facing interface page shared with the buyer via secure link

Surface as emerging; flag that customer demand exceeds deployed reality.

### AI MEDDIC / MEDDPICC extraction from transcripts

Ingest call transcripts (Gong / Granola / Zoom); AI extracts qualification fields (Metrics, Economic Buyer, Decision Criteria, etc.); populates the Opportunity fields. Surface with caveats: transcript ground truth is messy. Pattern is AI draft -> human verification, not autonomous. Several customers have asked for this; few have shipped it accurately.

### AI inbound classifier with auto-routing

AI reads inbound lead text / form; classifies by ICP fit, intent, urgency; auto-routes to the right team or auto-replies with disqualification. Pattern customers ask for; works for well-defined ICP boundaries; struggles with edge cases.

### AI account-brief from web research

Combine internal data + LinkedIn + news + 10-K + podcasts -> meeting-prep brief. AI Field Agents pattern. Production examples exist across investment-management customers (e.g., AUM extraction from PDFs, exec hire/exit signals from LinkedIn). Surface as a pattern to scaffold, not a default -- set expectations around enrichment latency and accuracy.
