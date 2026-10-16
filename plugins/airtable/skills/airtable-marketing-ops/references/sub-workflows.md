# Sub-workflow playbooks for airtable-marketing-ops

Playbooks for the lead 10 sub-workflows named inline in `SKILL.md`, plus a longer tail of reference-available shapes. Load only the section that matches the user's invocation; don't read the whole file.

Each playbook follows the same shape:

-   When this fires -- the user phrasings that surface it.
-   Setup-mode prep -- schema additions or extensions needed (if any).
-   Work-mode operations -- what the agent does via the MCP.
-   What gets handed off -- `airtable-link` target plus any UI configuration steps.
-   Sample output -- the shape of the agent's response.

## 1. Universal marketing request intake -- the "front door"

The single most universal airtable-marketing-ops invocation. A primary value-prop in many deployments; the dominant pattern in enterprise implementations.

When this fires: _"set up a marketing request form,"_ _"build a creative intake,"_ _"we need a single front door for marketing requests,"_ _"too many email-driven requests with no visibility,"_ _"can't push back on requests because I can't show our capacity,"_ _"projects show up out of nowhere with no SLA."_

Setup-mode prep: at minimum, the small (3-4 table) shape with a public-facing Form view on a Marketing Requests table feeding Campaigns or Briefs. For larger teams, add conditional logic on the form (request type -> channel-specific fields -> automated routing). For multi-tier triage, add an `Urgency` and `Triage tier` field on the request table. For SLA tracking, add a formula `IF({Status} != "Done", DATETIME_DIFF(NOW(), {Submitted at}, 'h'), BLANK())`. Wire a Slack notification on form submit + assigned designer.

AI-native variant (copilot pattern): add an `AI categorization` field on Requests (classifies by request type -- design / copy / video / event / other), an `AI urgency suggestion` field, and an `AI recommended owner` field that reads the description plus the team's current capacity rollups. The agent reads each new request, surfaces the AI suggestions in a triage view, applies them via `update_records_for_table` only after a human triager reviews and approves a batch (or filters to "Auto-approve confidence > N" if the user explicitly opts into it). The AI fields pre-populate; the human stays the decision point.

Work-mode operations:

1.  Fetch unprocessed requests via `list_records_for_table` with filter `{Status} = "New"`.
2.  For each request: read the description, classify the request type, set Urgency / Triage tier, assign Owner.
3.  Generate the campaign record (if approved) or send rejection / clarification note (if not).
4.  For triage queues: surface top 10 by Urgency with reasoning.
5.  Surface capacity status (how many open requests per Owner; current week vs. baseline).

Hand off: link to the request triage interface page or the Requests table filtered to "New / Approved this week."

Sample output:

```
Triaged 23 marketing requests:
  - 8 approved -> routed to Creative queue (Marina has 5 active; Joon has 3)
  - 11 routed to Social queue
  - 4 clarification needed (sent to requesters via Slack)

Top 3 by urgency:
  1. [APAC LATAM Q3 launch -- comms support] -- due Aug 18
  2. [Black Friday email series -- 4 variants] -- due Sept 9
  3. [Legal claim update for fall campaign] -- due Aug 22

Capacity flag: Creative is at 95% of weekly baseline; pushing back on 2 lower-priority requests is recommended.

[View Marketing Requests in Airtable](https://airtable.com/<appId>/<tblId>?view=Triage)
```

## 2. Global campaign management and orchestration

The largest "named pattern" cluster across the research -- campaign-to-tactic hierarchy, multi-channel coordination, exec visibility.

When this fires: _"set up a campaign tracker,"_ _"build me a master marketing calendar,"_ _"global campaign hub,"_ _"orchestrate campaigns across regions,"_ _"single source of truth for marketing,"_ _"multi-brand campaign coordination."_

Setup-mode prep: small or mid shape minimum. Default to 3-tier hierarchy (Campaign -> Tactic -> Task); offer 4-tier (Campaign -> Program -> Project -> Tactic) on demand. Warn against 5-tier unless the user has dedicated MOps headcount -- it's aspirational and fragile to maintain. Add Channel as multipleSelects on Campaigns; add Owner on every level; add timeline view keyed by Start date; add stakeholder-specific interfaces.

AI-native variant (copilot pattern): add an `AI status summary` field on Campaigns that synthesizes the latest state from linked Tactics + Tasks (status counts, blockers, owners pending). At review time, the agent pulls the summary across active campaigns to draft an exec digest narrative -- a Slack message, a weekly leadership email, or an Interface dashboard card. Human reviewer (typically MOps director or VP Marketing) edits the digest before it's shared with leadership. Effective when the user describes "I spend half my Monday writing the status update" or "exec digests are a swivel-chair tax."

Work-mode operations:

1.  Identify campaign scope -- single team, brand, region, or org-wide?
2.  Fetch current Campaigns via `list_records_for_table`; filter to active statuses.
3.  Score or re-score by RICE / WSJF if requested.
4.  Update statuses, ownership, or quarter assignments as the user directs.
5.  For portfolio reviews: aggregate by Brand / Region / Channel; produce a summary the agent can hand back.

Hand off: link to the Campaigns table or the Leadership interface page (whichever the access surface proves).

Sample output:

```
Updated 18 campaigns -- scored by RICE, set Q3 owner on 7 high-confidence campaigns, moved 3 to "Next."

Top campaigns by RICE this quarter:
  1. [Spring 2026 brand refresh] -- RICE 32
  2. [APAC localization launch] -- RICE 24
  3. [Loyalty program relaunch] -- RICE 21

Q3 capacity check: Brand owns 6 / Performance owns 4 / PR owns 3.

[View Marketing Campaigns in Airtable](https://airtable.com/<appId>/<tblId>)
```

## 3. Creative production / brief intake / asset workflow

Form-driven brief intake -> designer assignment -> multi-round review with native Airtable annotation -> versioning -> final assets stored in Airtable's Assets table (or pushed to an external DAM if one's already in place). Often coupled with brand-compliance review.

When this fires: _"manage creative briefs,"_ _"creative ops,"_ _"in-house agency on Airtable,"_ _"designer queue,"_ _"asset versioning,"_ _"brief intake form,"_ _"creative request tracking,"_ _"agency coordination."_

Setup-mode prep: mid shape minimum (Briefs + Assets + Tasks). Conditional intake form (different fields by asset type). Record templates that auto-spawn standardized tasks per brief type. Multi-stage Status field (draft -> brand review -> approved -> in production -> final).

AI-native variant (copilot pattern): add an `AI brief expansion` field on Briefs -- input is the requester's bullet-point description; output is a structured brief (audience, channel, key message, asset list, success metrics, locale considerations). The designer / copywriter assigned reads the AI-expanded brief, edits inline, and confirms before kicking off production. Pair with AI-drafted first-pass copy / image generation as separate AI fields per asset variant -- drafts go to designer/copy review before becoming the working version. Strong fit when the user describes "briefs are always half-written" or "I spend the first hour of every brief asking clarifying questions."

Review surface -- use Airtable's native review features:

-   Asset Review -- pixel-perfect annotation directly on image / video attachments. Threaded comments. Reviewers drop comments on the exact area of an image or frame of a video. Combine with @mentions and / or automations pushing notifications to Slack / Teams when a new version is uploaded or a reviewer leaves feedback.
-   Proofing -- adds versioning (each newly uploaded file becomes the next version), side-by-side version comparison, and annotation tools on supported document formats. Comment-only users can fully participate -- strong fit for agency / external-stakeholder review loops (pair with Airtable Portals for branded external access).
-   External proofing tools (PageProof / Frame.io / Ziflow) remain useful for specialized cases (broadcast video, very strict version-control), but don't default to external proofing -- Asset Review and Proofing cover the dominant cases natively.

For current plan-tier gates, supported formats, file-size limits, and the specific annotation toolset on Asset Review / Proofing, see `support.airtable.com` at execution time -- those evolve.

Work-mode operations:

1.  Fetch new briefs via `list_records_for_table` with filter `{Status} = "Draft"`.
2.  For each brief: validate completeness (required fields filled), score complexity, assign Designer / Copy based on capacity.
3.  Spawn standardized task list from a template.
4.  Surface stuck briefs (in review > X days).

Hand off: link to the Designer queue interface or Briefs table filtered to current assignee.

Sample output:

```
Processed 12 new creative briefs:
  - 9 routed to designers (3 to Marina, 4 to Joon, 2 to Yara)
  - 2 sent back for missing info (audience, locale)
  - 1 escalated as P0 (CFO offsite materials)

Stuck briefs flagged:
  - [Holiday banner suite] -- in review 7 days, pending brand sign-off
  - [Q3 webinar slide kit] -- in review 5 days, pending copy edits

[View Designer queue in Airtable](https://airtable.com/<appId>/<tblId>?view=Designer)
```

## 4. Content calendar / editorial planning

Multi-channel publishing cadence (email + social + web + blog). The unit of work is the content piece, not the campaign. Dominant pattern in mid-market.

When this fires: _"build a content calendar,"_ _"editorial calendar,"_ _"social media calendar,"_ _"publishing cadence,"_ _"manage our content pipeline,"_ _"replace our spreadsheet calendar."_

Setup-mode prep: small / mid shape with a Content / Posts table (Title, Channel, Publish date, Status, Asset link, Owner, Linked campaign). Calendar view keyed by Publish date. Form intake for content submissions. Status workflow: Draft -> Copy review -> Brand review -> Scheduled -> Published.

AI-native variant (copilot pattern): at review time, the agent reads the calendar for the next 4 weeks, identifies channel-by-channel gaps against a user-defined cadence baseline (e.g. "social: 8/week, email: 3/week, blog: 1/week"), and drafts content ideas to fill them -- each idea writes to a `Content Ideas` table with an `AI suggested title`, `AI suggested angle`, and `Linked campaign` (if relevant). The content lead reviews each idea and either promotes it to a scheduled post (via the Posts form) or discards it. The drafting is AI; the calendar commit stays human.

Work-mode operations:

1.  Fetch upcoming content via `list_records_for_table` filtered to `{Publish date} <= 14 days`.
2.  Identify gaps (channels with no scheduled content this week), surface re-publish opportunities.
3.  Validate copy / asset readiness for scheduled posts.
4.  Update statuses as content moves through review stages.

Hand off: link to the Content calendar view.

Sample output:

```
Content calendar -- next 14 days:
  - 8 posts scheduled across email (3), social (4), blog (1)
  - 2 in copy review (Q3 newsletter -- needs final review by Friday)
  - Gap flagged: Wed/Thu no email scheduled

Coverage by channel:
  - Email: 3/5 weekly baseline
  - Social: 4/8 weekly baseline (below cadence)
  - Blog: 1/1 weekly baseline

[View Content Calendar in Airtable](https://airtable.com/<appId>/<tblId>?view=Calendar)
```

## 5. Marketing budget / financial planning and PO tracking

Plan annual spend -> commit via POs -> reconcile against invoices. Enterprise-heavy; surface as an add-on when the user mentions budget, spend, or PO.

When this fires: _"track marketing budget,"_ _"manage POs,"_ _"reconcile spend,"_ _"budget vs actual,"_ _"vendor invoices,"_ _"annual planning,"_ _"top-down allocations,"_ _"bottom-up budget requests."_

Setup-mode prep: large shape with Budget + POs tables. Multi-stage PO Status (Draft -> Submitted -> Approved -> Invoiced -> Paid). Quarterly rollups; variance formulas (Actual - Planned). Integrate with SAP / NetSuite / Oracle / Workday via sync where possible. Approval workflow: program manager -> team lead -> MOps -> CMO -> CFO.

AI-native variant (copilot pattern): add an `AI variance explanation` field on Budget records -- input is planned vs. actual + linked POs / invoices + the program owner's notes; output is a narrative explanation of the variance with two-to-three reallocation suggestions. Useful for QBR prep, monthly close, and CFO-ready briefs. MOps director reviews the explanation and edits the reallocation suggestions before sharing. The AI surfaces the "why behind the number"; the human owns the recommendation.

Work-mode operations:

1.  Fetch open POs via `list_records_for_table` with filter `{Status} != "Paid" AND {Status} != "Closed"`.
2.  Surface pending approvals by approver role.
3.  Compute variance per Quarter / Channel / Brand.
4.  Flag overspend, underspend, expiring contracts.

Hand off: link to the Budget interface or POs table filtered to current approver.

Sample output:

```
Q3 budget status:
  - Total planned: $2.4M / Committed: $1.9M / Actual: $1.6M (67% through quarter)
  - Variance: under by $300K on Performance Marketing, over by $80K on Events
  - 12 POs pending approval (8 with CMO, 4 with team leads)

Flags:
  - [Vendor X agency contract] -- expires Aug 31, no renewal PO submitted
  - [Influencer program Q3] -- $50K committed, $0 invoiced so far

[View Budget interface in Airtable](https://airtable.com/<appId>/<pageId>)
```

## 6. Marketing ROI / attribution / performance measurement

UTM URL generation -> performance ingestion -> dashboards. Almost always coupled with campaign orchestration; rarely stand-alone.

When this fires: _"track marketing ROI,"_ _"build UTM taxonomy,"_ _"replace UTM.io,"_ _"campaign attribution,"_ _"performance dashboard,"_ _"channel-level reporting,"_ _"MTA setup."_

Setup-mode prep: small / mid shape with Performance table. UTM URL builder via formula field (concat with SUBSTITUTE for encoding, validation via IF / AND). Locked taxonomy picklists (Source / Medium / Campaign / Term / Content) to enforce link integrity. Sync from Salesforce / Google Analytics / Sprout / Meta Ads. Output to Power BI / Tableau / Looker / Snowflake.

AI-native variant (copilot pattern): add an `AI performance narrative` field on Performance records (or a Performance Summary table) -- input is UTM-tagged event data + linked Campaign metadata + the period (last 30 days, Q3, etc.); output is a narrative summary per region / brand / channel ("EMEA brand retargeting underperformed at 0.6x ROAS; recommend pausing or shifting to performance ad units"). Performance / analytics lead reviews the narrative before it's shared in the QBR or sent to leadership. AI does the synthesis; human validates the recommendation.

Work-mode operations:

1.  Fetch active campaigns via `list_records_for_table` with filter `{Status} = "Live"`.
2.  For each: validate UTM completeness, surface missing taxonomy values.
3.  Generate compliant tracking URLs for new campaign launches.
4.  Compute ROAS / CPA / LTV-to-CAC where possible.
5.  Surface top + bottom performers by channel.

Hand off: link to the Performance table filtered to current period.

Sample output:

```
Generated 14 UTM URLs for Q3 launches:
  - All passed taxonomy validation (Source / Medium / Campaign / Term / Content)
  - 3 flagged for review (Term field empty -- recommend adding)

ROAS leaderboard (last 30 days):
  - [Spring giveaway -- Meta] -- 4.2x ROAS
  - [Newsletter relaunch -- email] -- 3.8x ROAS
  - [Brand retargeting -- display] -- 0.6x ROAS (under baseline)

[View Performance in Airtable](https://airtable.com/<appId>/<tblId>)
```

## 7. Capacity / resource planning and utilization tracking

Forecast workload, justify headcount, balance designers / PMs / agencies. Distinct from intake -- this is about visibility, not routing.

When this fires: _"workload visibility,"_ _"capacity tracking,"_ _"designer utilization,"_ _"justify additional headcount,"_ _"balance team workload,"_ _"socialize workload."_

Setup-mode prep: mid / large shape with a Capacity table (Team / Quarter / Person-weeks available / Person-weeks committed). Rollup committed hours from Tasks. Utilization formula = committed / available. Red / yellow / green status field.

AI-native variant (copilot pattern): add an `AI recommended assignee` field on Tasks -- input is the task description + linked-record skills/specialties on each Designer/Copywriter + the current capacity rollups; output is a ranked top-3 assignees with reasoning ("Marina -- 60% utilized, matches Email + Lifecycle skills"). PM reviews and confirms the assignment via `update_records_for_table`. Also add an `AI capacity narrative` field on Capacity records that surfaces overload risks and headcount-justification metrics ("Designer team has absorbed +50% YoY brief volume with no headcount growth") for use in QBRs.

Work-mode operations:

1.  Fetch current-week Tasks via `list_records_for_table` with date filter.
2.  Compute hours per Assignee.
3.  Compare to capacity baseline; surface over-utilized people and under-utilized people.
4.  For new requests: recommend the right assignee based on capacity AND skill / specialty.
5.  Build year-over-year metrics for headcount justification (request volume growth vs. headcount growth).

Hand off: link to the Capacity interface or per-team utilization view.

Sample output:

```
This week's capacity snapshot:
  - Marina: 95% utilized (over baseline) -- 2 P2 tasks could shift to Joon
  - Joon: 60% utilized -- has bandwidth for 3-4 more briefs
  - Yara: 110% utilized (red) -- recommend pushing back on 1 P3 brief

YoY headcount justification metrics:
  - Q3 2025: 100 briefs / 3 designers = 33 briefs/designer
  - Q3 2026: 150 briefs / 3 designers = 50 briefs/designer (+50% / no headcount growth)

[View Capacity in Airtable](https://airtable.com/<appId>/<pageId>)
```

## 8. Multi-market execution and localization

Global master -> regional opt-in / opt-out -> locale variants -> localized asset delivery. Enterprise-only; don't default to locale-aware fields.

When this fires: _"multi-market rollout,"_ _"localization workflow,"_ _"regional campaigns,"_ _"global-to-local,"_ _"locale variants,"_ _"sub-brand coordination,"_ _"translate this for [region]."_

Setup-mode prep: enterprise shape with Regions / Locales table. Add `Locale` (singleSelect) on Assets. Hub-and-spoke sync: master campaign hub syncs to regional bases; regional bases opt-in or modify, sync back. Locale-specific approval gates if regulated.

AI-native variant (copilot pattern): add `AI translated copy` and `AI localization brief` fields on locale-variant Assets -- input is the master asset + the target Locale + any regulatory metadata; output is translated headline / body copy plus a brief covering locale-specific tone, cultural caveats, and regulatory-disclaimer flags. Regional marketing lead reviews and edits the translation, validates the disclaimer flags, and confirms the locale variant. Particularly load-bearing when the user has approved-vendor LLM constraints (Azure OpenAI / Gemini-only) -- the AI fields can be routed through the approved provider.

Work-mode operations:

1.  Identify global campaign + target locales.
2.  For each locale: spawn locale-variant Assets via record template, marked "Pending translation."
3.  Auto-populate locale-specific dates (holidays -- Ramadan, Eid, Christmas, New Year per locale).
4.  Surface regions that have opted out and reason.
5.  Roll up performance metrics by locale.

Hand off: link to the localized assets view filtered by Locale.

Sample output:

```
Localized [Spring 2026 launch] to 8 markets:
  - Created 24 locale variants (3 assets × 8 locales)
  - Auto-populated locale-specific launch dates (no overlap with regional holidays)
  - 2 markets opted out: India (regulatory delay), Brazil (timing conflict with carnival)
  - Translation pending: FR, DE, ES, JP, KR, AR

Rollup metrics last quarter by locale:
  - NA: $4.2M revenue / EMEA: $2.1M / APAC: $1.8M / LATAM: $0.4M

[View Multi-Market Calendar in Airtable](https://airtable.com/<appId>/<pageId>)
```

## 9. Brand-compliance review / approval workflow

Multi-stage approval gates -> audit trail -> regulatory disclaimer routing -> claim validation. Heaviest in regulated verticals.

When this fires: _"brand review,"_ _"legal review,"_ _"MLR review,"_ _"compliance gate,"_ _"approval workflow,"_ _"audit trail,"_ _"claim library,"_ _"can't ship until legal approves,"_ _"regulated industry."_

Setup-mode prep: large or enterprise shape with Approvals table. For regulated industries, add Claim Library + Disclaimer Library + MLR Reviews. Multi-stage Status on Assets: Draft -> Brand review -> Legal / Compliance -> Approved. Approval audit trail with timestamps and decision notes.

AI-native variant (copilot pattern): add an `AI compliance pre-flag` field on Assets in review -- input is the asset content + linked-record entries from the Claim Library + the Disclaimer Library + the asset's Locale; output is a list of likely compliance issues (unsupported claims, missing disclaimers, claim-locale mismatches). Human compliance reviewer (Legal / MLR) makes the final approval decision; AI accelerates the review by surfacing what to check first. Heaviest leverage in regulated verticals where reviewers are the bottleneck -- pre-flags can cut a 5-day MLR cycle to 1-2 days for asset categories where the AI's confidence is high.

Work-mode operations:

1.  Fetch assets awaiting approval via filter `{Status} = "In review"`.
2.  For each: validate required claims and disclaimers are linked.
3.  Route to next approver based on Phase.
4.  Surface stuck reviews (in review > SLA threshold).
5.  Build approval audit summary for regulatory reporting.

Hand off: link to the approval queue interface filtered by current approver.

Sample output:

```
Compliance review queue:
  - 14 assets in review (8 with Legal, 4 with Brand, 2 with MLR)
  - 3 stuck > 5 days (escalated to approver managers)
  - 6 missing required disclaimers per locale (flagged for asset owners)

Recent decisions:
  - [Q3 social series -- alcohol category] -- Approved with conditions (must add regional regulatory disclaimer per market)
  - [Pharma launch press release] -- Rejected (claim not in approved library)

[View Approval Queue in Airtable](https://airtable.com/<appId>/<pageId>)
```

## 10. Lightweight campaign tracker and agency multi-client delivery

Two variants of the same lightweight shape. The dominant SMB pattern: agencies running multi-client delivery is more common than solo marketers at the smallest segment.

When this fires:

-   _Lightweight variant_: _"solo marketer,"_ _"replacing spreadsheets,"_ _"small team marketing,"_ _"music release tracker,"_ _"book publicity calendar."_
-   _Agency variant_: _"agency,"_ _"multiple clients,"_ _"retainer drawdown,"_ _"client portal,"_ _"agency delivery,"_ _"in-house agency."_

Setup-mode prep: lightweight shape (2-3 tables: Campaigns + Tasks + Assets). For agency variant: add Clients table; decide between single base with `Client` field (most common) or per-client base (when client confidentiality is strict -- e.g., competing brands in same category). Add retainer drawdown formula on Clients. Add SLA stage on Tasks.

AI-native variant (copilot pattern): for the agency variant, add an `AI client status update` field per client per period -- synthesizes hours used + projects active + deliverables completed + blockers into a client-ready narrative. Account manager reviews and edits before sending to the client. For the lightweight variant, add `AI drafted task description` and `AI drafted campaign brief` fields -- the solo marketer types a one-line ask, AI expands to a structured record. The solo reviews and edits inline.

Work-mode operations:

-   _Lightweight_: simple intake -> routing -> status updates. No bureaucracy.
-   _Agency_: per-client triage (current user -> their clients). Retainer drawdown per client per period. Surface clients at risk of overage. SLA stage tracking per project.

Hand off: link to the lightweight calendar OR (for agency) the per-client client portal interface.

Sample output (agency variant):

```
Client portfolio status (5 active clients):
  - [Client A]: 22 hrs used / 40 retained -- on pace
  - [Client B]: 38 hrs used / 40 retained -- at risk of overage (push back on next request OR raise SOW)
  - [Client C]: 12 hrs used / 60 retained -- under-utilized (proactive outreach recommended)
  - [Client D]: project-based -- 3 active projects, 1 at delivery
  - [Client E]: NEW -- onboarding, no hours yet

SLA stage breakdown across all active work:
  - First concept: 4 / Pre-production: 6 / Final: 3 / Delivered: 11 / Approved: 8

[View Client Portfolio in Airtable](https://airtable.com/<appId>/<pageId>)
```

## Reference-available tail (load on demand)

### 11. Event planning and coordination

Event portfolio -> venue / speaker / attendee management -> registration -> comms -> post-event follow-up. Usually a sub-table of a broader campaign hub, not standalone. Co-owned by ABM or Field Marketing in B2B; Brand or Comms in B2C.

Schema additions: Events table (Name / Type / Date / Venue / Owner / Status / Linked campaigns / Budget); Attendees table (Name / Company / Status); optional Speakers table. Calendar view by Event date. Form intake for event submissions and attendee registration.

### 12. PR / press / comms calendar

Distinct sub-team workflow. Press contact database + media alerts + awards submissions + embargoes + coverage tracking. Heavy at SMB.

Schema additions: Press Contacts table (Name / Outlet / Beat / Last contacted / Notes); Media Outreach table (Contact / Campaign / Pitch / Status / Coverage URL). Calendar by Pitch date.

### 13. Internal / corporate / executive communications

Internal messaging, town halls, CEO comms, all-hands, regional rollups. Distinct from PR.

Schema additions: Internal Comms table (Audience / Channel / Cadence / Owner / Status / Linked campaign); approval routing through PR / Comms / CEO Office.

### 14. Ad-sales / ad-ops / trafficking

Vertical-specific to publishers, broadcasters, streaming services, and retail-media networks. Sell-side workflow: RFP -> IO -> trafficking -> pacing -> invoice -> revenue.

Schema additions: RFPs table (Advertiser / Brief / Stage / Owner); IOs table (Number / Advertiser / Flight dates / Spend / Status); Trafficking table (Asset / Placement / Pacing). Surface only when user is in the ad-sales / publisher / retail-media vertical.

### 15. Retail-media and visual merchandising / in-store activation

CPG / retail-specific. In-store calendar -> vendor coordination -> SKU / floor-set tying -> planogram approval -> store activation tracking.

Schema additions: In-store calendar with on-counter dates (OCD) and store-open dates as anchor dates for workback templates; vendor coordination; SKU links.

### 16. Email production / lifecycle / CRM campaign orchestration

Distinct from social / editorial calendar because of production volume + tight MAP handoff (Marketo / Eloqua / Adobe Campaign / SFMC). Intake -> audience -> copy / HTML build -> QA -> deploy -> metrics.

Schema additions: Email Campaigns table; Audience table (multipleRecordLinks to Cohorts); QA checklist as multipleSelects; integration with MAP via sync.

### 17. Experimentation / CRO / A-B testing program management

Hypothesis backlog -> RICE prioritization -> sprint -> test -> meta-analysis. Overlaps with airtable-product-ops's experimentation lifecycle pattern but oriented to marketing testing (channel, copy, creative) rather than product features. Common with Optimizely / VWO / Dynamic Yield integrations.

Schema additions: Hypotheses table (Title / Hypothesis / Owner / RICE score / Status); Tests table (Hypothesis / Variant / Audience / Start / End / Result / Confidence); meta-analysis rollups.

### 18. Music / entertainment release lifecycle

Vertical-specific -- release is the primary unit of work, campaigns hang off it. DSP partner management (Spotify, Apple Music, Amazon).

Schema additions: Releases table (Title / Artist / Release date / DSP partners / Status); pitching window dates; takedown dates.

### 19. Influencer / creator / talent management

Vetted talent library -> brief routing -> per-deliverable tracking -> compensation -> performance attribution. Over-represented at SMB; Enterprise uses CreatorIQ integration.

Schema additions: Talent table (Name / Channels / Audience size / Vetted status / Tier); Engagements table (Talent / Campaign / Deliverable / Comp / Status / Performance); per-creator compensation tracking.

### 20. Field-rep promo binder and vendor-funded marketing co-op

Role / region-filtered Interface views distributed to large field force. Vendor-funded marketing co-op (brand pays partner for activation).

Schema additions: Field Reps table; Promo Programs table; Co-op Funds table (Brand / Partner / Period / Budget / Used / Available).

### 21. University / nonprofit / advocacy campaign cadence

Higher-ed enrollment marketing + alumni comms + advocacy / petition lifecycle + policy outreach. Future skill candidate as `nonprofit-comms` or `higher-ed-marketing` if usage data shows demand. For now, lives here.

Schema additions: Constituency table (Audience / Region / Engagement level); Outreach table (Constituency / Channel / Cadence); Petition / Action table (Cause / Target / Status / Sign count).

### 22. Lightweight CRM / customer-marketing tracker

Mid-market-distinctive. Airtable as Salesforce alternative for non-revenue customer-marketing work -- testimonial banks, customer-advocacy programs, expert relationship tracking. Common in marketing orgs where Sales owns Salesforce but customer-marketing needs its own thin record.

Schema additions: Contacts table (lightweight -- Name / Company / Role / Notes); Engagements table (Contact / Type / Date / Owner / Status); deal-stage NOT included (this is the marketing-side counterpart to Sales's Salesforce).
