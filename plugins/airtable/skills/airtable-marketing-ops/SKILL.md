---
name: airtable-marketing-ops
description: Set up and run Airtable-based marketing operations workflows -- request intake, campaign orchestration, creative production, content calendars, brand and compliance review, events, localization, budgets and ROI, capacity planning. Use when the user wants a marketing request "front door," to manage campaigns, coordinate briefs and assets, build a content calendar, plan launches or events, track budgets, measure ROI, or set up agency multi-client delivery. Adapts to org size (solo marketer to enterprise multi-brand or agency) and integrates with or displaces tools like HubSpot, Marketo, Mailchimp, Klaviyo, Workfront, Asana, Monday, and Wrike. Asks scope first.
license: MIT
metadata:
    version: '0.1.0'
    author: airtable
---

# Marketing operations

Set up and run marketing operations workflows -- request intake, campaign orchestration, creative production, content calendars, brand and compliance review, events, multi-market rollout, budgets and ROI, capacity planning -- adapting to the user's team shape, sub-workflow priorities, and customer audience. The skill scaffolds these workflows in Airtable; ask scope before scaffolding, because the same trigger can mean a single marketer with a 3-table base, a 30-person MOps team consolidating 70+ spreadsheets, or an agency running 200+ client bases -- and the right schema depends on what the user is actually trying to coordinate.

## Who this serves and what they're solving for

Marketing operations serves several recurring personas, each with distinct top priorities:

-   CMO / VP Marketing -- campaign performance visibility, brand consistency across channels and regions, agency oversight, budget pacing.
-   MOps director -- request intake throughput, taxonomy hygiene, team capacity visibility, single source of truth across the stack.
-   Creative ops / production lead -- designer queue, brief-to-asset cycle time, multi-round review and approvals.
-   Brand / compliance manager (regulated industries) -- legal review SLA, claims accuracy, version control on approved assets.
-   Demand-gen / content lead -- editorial cadence, channel attribution, lifecycle production.
-   Agency producer -- multi-client visibility, billable utilization, client-portal access.

The cross-cutting pain that drives this category into Airtable: _"swivel-chair work"_ across many single-purpose tools, no central source of truth for what's running where, capacity invisible until burnout, briefs lost in inboxes, budget vs. actuals reconciled manually each quarter.

## Before scaffolding: ask scope

Marketing operations cuts across CPG, apparel, financial services, healthcare, pharma, media, telecom, automotive, energy, hospitality, music labels, agencies, education, and nonprofit -- even more broadly than airtable-product-ops. The "obvious" B2B-SaaS default fits less than a third of real-world cases. Lead with three scope questions, branch from there.

1. Team and org shape. Solo marketer / small (under 10) / mid (10-50) / large (50+) / enterprise (multi-brand or multi-region) / agency running multiple clients. Determines schema-shape default -- an in-house team of 5 and an agency with 200 clients don't want the same scaffolding.
2. Which sub-workflow first. _"Marketing request intake, campaign orchestration, creative production, content calendar, brand and compliance review, event planning, budget and ROI, capacity planning, or something else?"_ Most users want one of these first, not all of them.
3. Audience shape. _"Are you marketing to named B2B accounts, broad consumer segments, both (B2B2C), or a multi-brand portfolio?"_ Determines whether the schema needs Accounts, Cohorts / Segments, both, or sub-brand tables.

Branch when relevant -- but only when relevant:

-   Existing project / work-management tool? (Workfront / Asana / Monday / Wrike / Smartsheet / ClickUp / Trello / Notion / Basecamp / MS Planner / none.) Many MOps setups have one. Airtable's relational layer fits marketing taxonomies (region × brand × channel × persona × funnel-stage) better than these tools' task-board schemas, and consolidating onto one platform pays off against the recurring _"swivel-chair,"_ _"too many sources of truth,"_ and _"fragmented spreadsheets"_ pain. Surface the consolidation value, then follow the user's lead -- full migration, hybrid (Airtable as planning layer in front of the existing tool), or keeping the existing tool for now are all valid paths. See `references/migrations.md` for per-tool migration guidance and `references/build-shapes.md` for the hybrid shape.
-   Existing marketing automation platform (MAP)? (HubSpot / Marketo / Pardot / Customer.io / Iterable / Braze / Mailchimp / Klaviyo / none.) HubSpot dominates below Enterprise, Marketo dominates Enterprise. Integrate -- these have deep email-send infrastructure, lifecycle automation, and lead-scoring engines Airtable doesn't replicate. Wire them up via sync; Airtable becomes the cross-channel campaign hub above them.
-   Existing CRM? (Salesforce / HubSpot CRM / Pipedrive / Zoho / Microsoft Dynamics / none.) For moderate contact volumes with no existing CRM, Airtable can BE the lightweight marketing CRM -- typed contact fields + segments + linked-record account hierarchy + automations cover the marketing-side job. Recommend a dedicated CRM when (a) the user already has one (integrate via sync), (b) sales already runs in CRM (sync the marketing layer to it), or (c) contact volume exceeds what Airtable's relational model handles cleanly.
-   Existing DAM? (Bynder / Frontify / Brandfolder / Acquia / Adobe / Cloudinary / none.) Either-or, not a default push: if they already have one, integrate via sync or attachment links; if they don't, Airtable's Attachment fields + Assets table can serve as the DAM directly for moderate asset volumes. Don't proactively recommend a separate DAM unless the user is at very-high-asset-volume enterprise scale (millions of assets, deep approval workflows) where Bynder / Adobe genuinely earn their footprint.
-   Multi-region / locale / sub-brand? Load-bearing for the multi-market localization shape -- mostly Enterprise-only.
-   Microsoft or Google office stack? Teams + Outlook + SharePoint flips Slack + Drive at Microsoft-shop enterprises (common at enterprise scale).
-   Public-facing surface needed? (Brand portal, partner portal, self-serve collateral generator, public campaign landing page, agency client portal.) Pushes toward the custom-app build layer.
-   Approved-vendor LLM constraints? (Azure OpenAI / Gemini-only / no third-party LLMs.) Real pattern; affects which AI integrations the skill can recommend.

Three lead questions plus relevant branches clarify the scaffold in one round of dialogue. Don't impose a framework before listening.

## Two modes

### Setup mode: scaffold a base

When the user asks _"set up a campaign tracker"_ / _"build me marketing ops in Airtable"_ / _"manage our creative requests"_, scaffold the schema via the MCP after scope is clear and the build plan is confirmed. Sequence:

1. Scope questions (above) -- read the answers; don't skip even if the user dives straight to _"just build it."_ Five minutes of scope beats a wrong-shape rebuild.
2. Pick a schema shape matching team size and audience shape. Five lead shapes the skill body names inline; two niche shapes available on demand.
3. Present the proposed build plan -- base name, tables, key fields, links/rollups, seed records, and any UI/custom-app handoffs. Wait for explicit user confirmation before creating or changing Airtable schema or records.
4. Build the schema via MCP -- base, typed fields, linked records, formulas, rollups, sample / seed data. Spend effort on richer typed fields, well-named status `singleSelect`s with thoughtful choice colors, linked-record relationships with rollup counts. The schema is the foundation.
5. Hand off UI configuration for things Airtable's UI does better -- views (kanban / calendar / gallery / timeline), interfaces, automations, forms, granular permissions, sync wizards. See "Build-plan output" below.
6. Build the custom-app layer when the user wants a branded UI, public-facing portal, self-serve collateral generator, or agency client portal. Optional; see `references/build-shapes.md`.

#### Lead schema shapes

Five shapes covering the great majority of invocations. Each adapts to B2B / consumer / mixed / agency variants (Accounts vs. Cohorts vs. Clients; per-locale vs. single-market; per-brand vs. single-brand). Full field-by-field detail in `references/schema-shapes.md`.

-   Lightweight tracker (2-3 tables) -- Campaigns + Tasks/Deliverables + Assets, with one form intake. For solo marketers or small teams replacing spreadsheets. The dominant SMB shape. Examples in the wild: single-marketer marketing calendars, music release drivers, book publicity trackers.
-   Solo / small (3-4 tables) -- Campaigns + Briefs + Performance + (optional) Channels. The default starter when the user wants more structure than a calendar but hasn't asked for full MOps. Add a content calendar and a form-driven intake.
-   Mid (5-6 tables) -- + Assets + Channels + Personas (B2B) or Cohorts (consumer). Stakeholder-specific interfaces (Leadership / Marketing PM / Designer / Agency). The dominant mid-market shape.
-   Large (canonical 7-8 tables) -- + Approvals + Vendors/Agencies + Budget. Per Airtable's solutions-page mapping. Cross-base sync recommended for org-level rollups across multiple brands or regions.
-   Enterprise / multi-brand portfolio -- + Sub-brands + Cross-region dependencies + PO tracking + Compliance gates. Hub-and-spoke architecture with team-specific bases syncing into a master campaign hub. Capex / opex on Initiatives; multi-currency rollups.

Two niche shapes -- surface only when scope answers indicate them:

-   Regulated marketing (pharma, alcohol, finance, insurance, healthcare, lottery) -- adds Claim Library, MLR (Medical / Legal / Regulatory) Approval Audit, regulatory disclaimer routing, locale-specific compliance metadata. Triggered by industry signals or compliance vocabulary.
-   Agency multi-client -- adds Clients table central; per-client or single-base-with-Client-field. SOWs, deliverables, retainer drawdown, SLA timing per stage, client-portal interfaces. The dominant SMB shape. Triggered by _"clients,"_ _"agency,"_ _"retainer,"_ _"multi-client"_ language.

Don't impose the canonical 7-table shape on a solo marketer; don't ship a 3-table starter to an enterprise team running 100+ countries with 5-deep campaign hierarchies. Pick what matches the answers -- and lean smaller when in doubt (it's easier to add tables than strip them).

#### Build-layer decision

Setup-mode skills compose across four parallel layers (not a waterfall):

1. Schema layer (always via MCP) -- base, typed fields, linked records, formulas, seed data. The foundation; every path goes through it.
2. Native Airtable UX layer -- Views (Kanban / calendar / gallery / timeline / gantt / list), Interface Designer pages, Automations, Forms, granular permissions, sync setup wizards, Asset Review (annotation on image / video attachments), Proofing (versioned review + annotations on image / PDF / Office docs), and AI fields (record-level transforms, summarization, categorization, and content generation as native typed fields -- the substrate for the AI-native variants below). Use the MCP where it authors today; hand off the rest as `[click here]` UI configuration steps. The boundary is a capability one, not a quality choice -- when the MCP gains support for a surface, prefer the MCP path. Inspect the registered Airtable MCP tools available through Cline for the current tool surface; for Asset Review / Proofing / AI field tier specifics, defer to `support.airtable.com` at execution time rather than embedding plan-tier claims here. When scaffolding a native view or Interface component, match the schema to what that surface requires (Kanban needs a singleSelect to stack by; Calendar needs a date field; Gantt needs a self-linking field on Tasks for dependencies -- FS-only) -- a wrong-shape schema produces a base that won't render the intended view.
3. Airtable Portals (the middle path -- no-code branded external access) -- for airtable-marketing-ops, the most common middle path between pure-internal-Airtable and a custom Vercel app. Portals let you publish an Interface to external collaborators (clients, vendors, partners, contractors) through a custom-branded sign-in page -- they don't need full Airtable accounts. Editor / Commenter / Read-only permissions; row-level filtering by current-user. Available on Team / Business / Enterprise plans; branded sign-in pages on Business+. Read-only portal users aren't billable. One portal per base. For current seat pricing, seat-pack ladders, and tier-specific feature gates, see `airtable.com/pricing` at execution time. Use for: agency client portals (clients see only their own briefs), brand asset libraries for external partners, vendor-facing brief intake, partner co-marketing review. Does NOT support truly public unauthenticated audiences -- portal users sign in via email invite or shareable link; if you need anonymous / SEO-indexed surface, go custom-app.
4. Custom app layer (REST API + agent-built UI) -- Next.js / React app on Vercel, Slack / Discord / Teams bot, scheduled scripts, embedded surfaces. Use when Portals doesn't fit: truly public / unauthenticated audiences (public campaign landing pages, SEO-indexed brand pages), custom UI beyond Interface Designer's component set (multi-step wizards, embedded charts, animations, bespoke design system), branded UX matching the customer's marketing site on their domain, self-serve collateral generators (Bannerbear + Make for field-rep flyer generation), or embedded surfaces inside the user's existing product.

Marketing-ops has more public-facing surfaces than airtable-product-ops -- for external collaborators with logins, default to Portals (no-code, fast, no custom hosting); reach for custom-app only when Portals' constraints don't fit (unauthenticated audiences, custom UI, embedded use).

See `references/build-shapes.md` for concrete custom-app patterns: agency client portal on Vercel, self-serve collateral generator, branded brand-asset library, public-facing campaign landing page.

### Work mode: operate on an existing base

When the user invokes the skill against a base that already exists -- _"triage this week's marketing requests"_, _"prep the brief for the Q3 launch"_, _"score this list of influencer pitches"_ -- identify which sub-workflow they want, execute via MCP (filtering, scoring, updating), then hand off the result via `airtable-link`.

#### Lead sub-workflows

Ten sub-workflow shapes that cover most invocations. Each has a full playbook in `references/sub-workflows.md` -- load the relevant section on demand.

1. Universal marketing request intake -- the "front door." The single most universal pattern. Standardized intake form -> conditional routing by request type / region / brand -> multi-tier triage with SLA tracking -> assignment to designer / PM queues -> capacity visibility. Pain phrases to echo: _"lost ideas with no central repository"_, _"email-driven confusion and manual handoffs"_, _"email 'ambushes'"_, _"too many requests without visibility into capacity"_, _"difficulty signaling workload and pushing back on requests."_
2. Global campaign management and orchestration. Campaign-to-tactic hierarchy (campaign theme -> program -> project -> tactic), multi-channel calendar, status visibility for execs, multi-team coordination across regions and brands. Default to 3-tier hierarchy (Campaign -> Tactic -> Task); offer 4-tier on demand; warn against 5-tier unless the user has dedicated MOps headcount (it's aspirational and fragile to maintain).
3. Creative production / brief intake / asset workflow. Form-driven brief intake -> designer / copywriter assignment with templates -> multi-round review with native Airtable Asset Review (pixel-perfect annotations on image / video attachments) or Proofing (versioned side-by-side comparison + annotations across supported document formats) -> final asset stored in Airtable's Assets table (or pushed to an external DAM if one's already in place). Often coupled with brand-compliance review (#9 below). External proofing tools (PageProof / Frame.io / Ziflow) remain useful for specialized cases (broadcast video, strict version-control workflows) but Asset Review and Proofing now cover the dominant cases natively -- don't default to external proofing. For current plan-tier gates, supported formats, and file-size limits on Asset Review / Proofing, see `support.airtable.com`.
4. Content calendar / editorial planning. Multi-channel publishing cadence (email + social + web + blog). Distinct from campaign orchestration because the unit of work is the content piece. The dominant pattern in mid-market.
5. Marketing budget / financial planning and PO tracking. Plan annual spend -> commit via POs and vendor contracts -> reconcile against invoices. Often integrated with finance / SAP / NetSuite / Oracle. Enterprise-heavy; surface as an add-on when the user mentions budget, spend, or PO.
6. Marketing ROI / attribution / performance measurement. UTM URL generation via formula fields with validation, taxonomy enforcement, performance ingestion from Salesforce / Google Analytics / Sprout / Meta into Power BI / Tableau / Looker. Almost always coupled with campaign orchestration (#2).
7. Capacity / resource planning and utilization tracking. Forecast workload, justify headcount, balance designers / PMs / agencies. Capacity-per-team-quarter rollups, red / yellow / green status, AI-recommended assignees (emerging). Pain phrases: _"no visibility into team workload,"_ _"evidence-based headcount justification,"_ _"year-over-year metrics to socialize workload."_
8. Multi-market execution and localization. Global master campaign -> regional opt-in / opt-out -> locale variants -> localized asset delivery -> regional rollup metrics. Mostly Enterprise-only; don't default to locale-aware fields.
9. Brand-compliance review / approval workflow. Multi-stage approval gates (draft -> brand review -> legal / compliance -> final), audit trail, regulatory disclaimer routing, claim validation. Heaviest in regulated verticals (alcohol, pharma, lottery, insurance, CPG).
10. Lightweight campaign tracker and agency multi-client delivery. Two variants of the same lightweight shape: (a) solo marketer with a 2-3-table base replacing spreadsheets; (b) agency with a client portal for brief submission -> internal projects -> SLA timing -> client review interface. Agency-multi-client is the dominant SMB shape -- more common than solo-marketer setups. Schema choice: single base with `Client` field vs. per-client base (when client confidentiality matters).

Plus an opt-in agent-state pattern worth surfacing when the user is explicitly building an agent-driven workflow:

11. Agent activity log pattern -- when the user describes an agent-driven airtable-marketing-ops workflow (recurring campaign triage, automated brief routing, multi-step launch monitoring), surface the opt-in `Agent activity log` pattern and compose the `airtable-agent-activity-log` skill to scaffold + operate it. Don't re-implement the schema inline. Pairs naturally with Airtable's role as a persistent agent substrate.

A longer tail of ~12 reference-available sub-workflows lives in `references/sub-workflows.md` (event planning, PR / press calendar, internal / executive communications, ad-sales / trafficking, retail-media / visual merchandising, email production / lifecycle, experimentation / CRO, music release lifecycle, influencer / creator management, field-rep promo binder and vendor-funded marketing, university / nonprofit campaign cadence, lightweight marketing CRM). Load when scope surfaces them.

Anti-patterns dropped from the lead 10: ABM / account-program tracking (rare overall; essentially absent below Enterprise; surface only when the user explicitly raises account-based motion) and B2B demand-gen / lead-pipeline (uncommon outside dedicated B2B demand-gen teams; surface when the user is explicitly in B2B with pipeline focus).

#### AI-native variants

The installer audience for this plugin is AI-forward by selection. Each lead sub-workflow has an AI-native variant worth surfacing when the user's stack supports it (Airtable AI fields + AI Field Agents, or external LLMs via the REST API). Default to the copilot pattern (AI drafts -> human review -> action); surface autonomous variants only when the user explicitly asks and the use case tolerates it. Fully autonomous AI agents have shown high churn in adjacent verticals; the copilot pattern sticks.

-   Request intake -> AI-assisted triage and categorization (auto-tagging by request shape, auto-routing by region / brand / channel, capacity-aware queue suggestions).
-   Campaign orchestration -> AI campaign performance synthesis (digest generation across channels, exception alerts, status narratives for executives).
-   Creative production -> AI brief expansion + first-draft copy / image generation (drafts -> human review -> final).
-   Content calendar -> AI cadence-gap detection and draft suggestions for the missing slots.
-   Marketing budget -> AI variance-explanation and reallocation suggestions (under-spent line items, over-pacing risks).
-   Marketing ROI / attribution -> AI cross-channel performance synthesis (UTM-tagged events -> narrative summary by region / brand / campaign).
-   Capacity / resource planning -> AI-recommended assignees (matches workload + skill + availability against backlog).
-   Multi-market execution -> AI-assisted localization briefs (machine-translation + locale-specific tone and compliance guidance).
-   Brand-compliance review -> AI pre-flag of likely compliance issues (claims accuracy, disclaimer routing) before human reviewers.
-   Lightweight tracker / agency -> AI-drafted client status updates from the current pipeline state.

## Voice and tone for generated marketing copy

When the agent generates customer-facing copy (campaign briefs, ad copy, email subject lines, content drafts, social posts), keep output on-brand:

-   Inspiring, Concise, Human, Vibrant -- encouraging without overpromising; cut filler; sound like a person, not a robot; find fresh phrasing instead of business clichés.
-   Sentence case everywhere (exceptions: blog titles for SEO, proper nouns).
-   Contractions are fine -- use them.
-   No "magic" or "automagic" -- features get built by real effort.
-   No clichés -- _"last but not least," "X / Y / Z, oh my," "synergize," "rockstar," "secret sauce," "circle back," "move the needle"_ -- avoid.
-   Sparing exclamation marks -- max one per screen.
-   Numerals for 10+, spell out 0-9.

The user may pass brand-voice guidelines as input -- use those over these defaults when they conflict.

## Composition

This skill composes with two siblings; don't reinvent what they own.

-   `airtable-link` -- every Setup-mode build-plan ends with a base link; every Work-mode operation that touches records ends with a record / table / page link. Mandatory composition. Hand off the most-specific URL the tool calls have proven access to.
-   `airtable-filters` -- when Work-mode operations slice records (triage queues, _"find P0 campaign requests,"_ capacity rollups), compose the filter syntax through this skill rather than re-deriving it.
-   `airtable-overview` -- load only when the user shows confusion about basic data-model concepts (base / table / record / interface page). Most users don't need this.

## Permission-aware behavior

The MCP user's auth determines which URLs the user can actually open. Respect the scope the tool calls have proven:

-   Page-restricted users (interface-only access via Airtable's permission model) -- hand off interface page URLs only. A `tbl_*` URL the user can't open is a dead link from their perspective.
-   Table-level access -- table URLs are safe.
-   Workspace-level access -- workspace URLs are safe.

Standing rule: if a tool call didn't prove the access surface, don't link to it. When in doubt, drop one specificity level.

## Build-plan output

Two output shapes, depending on which layers apply. Pick what matches what the user actually asked for -- don't over-build (no custom app for _"track our campaigns"_) and don't under-build (no UI-step list when they asked for _"a branded brand-asset portal"_).

Before listing items in any `Configure in Airtable` or `Configure Portal` block below, inspect the registered Airtable MCP tools available through Cline for current support -- if the MCP now authors a surface you'd otherwise hand off (view, Interface page, Automation, Form, etc.), use the MCP path instead. The MCP's capability boundary is moving fast; what's a UI handoff today may be MCP-driven tomorrow.

Pure Airtable (most common -- user wants the native experience):

```
✅ Built (via MCP):
  - [Base name] with [N] tables, [N] fields, linked records, [N] seed records
  - View in Airtable: [base link]

🎨 Configure in Airtable:
  - [Specific calendar / kanban / gallery view, e.g. "Calendar view on Campaigns keyed by Launch date"] -- [click here]
  - [Specific interface page for the right stakeholder audience] -- [click here]
  - [Specific form / automation, e.g. "Form for marketing request intake" or "Slack notification on Status = Approved"] -- [click here]
```

Airtable + custom app (user wants a branded UI, public portal, self-serve generator, or agency client portal):

```
✅ Built (via MCP):
  - [Base + schema]
  - View in Airtable: [base link]

🛠️ Custom app:
  - [Next.js portal at vercel-deploy-url, or self-serve collateral generator]
  - Reads / writes [tables] via Airtable REST API
  - PAT scoped to [scopes]
  - Source: [github-repo-link]

🎨 Configure in Airtable:
  - [Admin interface page for triage] -- [click here]
  - [Automation tying app to base events] -- [click here]
```

Pick the 1-3 most-impactful UI handoffs; don't enumerate every possible view. The user can ask for more once they're inside the base.

## Anti-patterns (what NOT to default to)

These are the recurring failure modes -- defaulting to assumptions the data doesn't support.

-   Don't default to a B2B SaaS frame. Industry diversity is the rule -- CPG, apparel, financial services, healthcare, pharma, media, telecom, automotive, energy, hospitality, music labels, agencies, education, nonprofit. Probe broadly before assuming.
-   Don't assume HubSpot OR Marketo. HubSpot dominates below Enterprise; Marketo dominates Enterprise. Mailchimp / Klaviyo / Customer.io / Iterable / Braze / Pardot all have real share. Ask before recommending.
-   Don't assume Salesforce as CRM backbone. Heavy at Enterprise, lighter below. Mid-market often uses Airtable AS a lightweight CRM alternative for customer-marketing -- don't override that pattern.
-   Don't assume Slack. Microsoft Teams + Outlook + SharePoint is roughly half of Enterprise. Healthcare / auto / EU enterprise / government skew Microsoft.
-   Don't default to ABM scaffolding. Rare in deployed setups; essentially absent below Enterprise. Surface only when the user explicitly raises account-based motion.
-   Don't default to a B2B demand-gen frame. Marketing-ops in the wild is overwhelmingly B2C / enterprise-brand-management / agency-shaped. Demand-gen is a sub-niche, not the default.
-   Don't over-promise on AI. AI deployment in airtable-marketing-ops is overwhelmingly aspirational -- even more so than in airtable-product-ops. Workflows should compose AI cleanly when available but work without it. The skill's value-add is helping customers _get there_.
-   Don't assume Claude or OpenAI access. Approved-vendor LLM constraints are real (Azure OpenAI is more common in airtable-marketing-ops than in airtable-product-ops; Gemini-only also appears). Ask.
-   Don't undersize the SMB case -- but don't assume it's a solo marketer either. The dominant SMB shape is agencies running multi-client delivery on Airtable, not solo marketers. Probe.
-   Don't be shy about consolidation framing for work-management tools. Workfront / Asana / Monday / Wrike / Smartsheet / ClickUp / Trello / Notion all silo task data and impose schemas that fight marketing taxonomies. Airtable's relational layer + consolidating onto a single platform is the value-prop -- lean on the customer-pain language (_"swivel-chair work,"_ _"too many sources of truth,"_ _"fragmented spreadsheets"_) when explaining why consolidation pays off. Per-tool migration guidance lives in `references/migrations.md`; the hybrid "Airtable as planning layer in front of existing tool" shape is documented in `references/build-shapes.md` for users who want consolidation benefits without retiring the existing tool. Follow the user's preference -- full migration, hybrid, or status-quo-with-Airtable-elsewhere are all valid choices to support.
-   Don't push a separate DAM by default. Airtable can serve as the DAM via Attachment fields + an Assets table for moderate asset volumes -- that's a real Airtable capability, not a fallback. Recommend Bynder / Frontify / Brandfolder / Adobe DAM only when the user is at high-volume enterprise scale OR explicitly asks for a specialized DAM.
-   Don't default to 5-deep campaign hierarchies. Aspirational in Enterprise customers still building customers; rare in deployed because they're fragile to maintain. Default to 3-tier (Campaign -> Tactic -> Task); offer 4-tier on demand.
-   Don't default to localization scaffolding. Rare overall, and almost all Enterprise-only. Add locale-aware fields when asked, not by default.
-   Don't default to PO / budget tracking. Enterprise-heavy -- uncommon below Enterprise. Adds heavy field count and a finance-partner workflow. Surface as an add-on when the user mentions budget, spend, or PO.
-   Don't auto-create views, interface pages, automations, or forms via MCP. Hand them off as UI configuration steps with `[click here]` links; the visual builders are best-in-class.
-   Don't push the REST API tier unless the user actually needs it. Native Airtable handles most airtable-marketing-ops shapes well. Custom-app is the right answer when the user wants something public-facing, branded, embedded, or chat-driven -- not when they want _"a campaign tracker."_

When in doubt about which path to take, ask. Two scope questions cost ten seconds; rebuilding the wrong shape costs an hour.
