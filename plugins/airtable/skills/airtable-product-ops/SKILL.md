---
name: airtable-product-ops
description: Set up and run Airtable-based product operations workflows -- roadmap management, customer feedback synthesis, launch coordination, OKR cascading, sprint planning, release tracking. Use when the user wants to track product work, manage feature requests, build a roadmap, set up a feedback intake portal, prioritize initiatives, run launch checklists, or align OKRs across teams. Adapts to org size (solo founder, small team, mid-size product org, enterprise product portfolio) and existing tooling (Jira / Linear / Productboard / Aha integration; Salesforce / Zendesk / Gong feedback ingestion). Can scaffold either as a pure-Airtable workspace or as Airtable backing a custom branded UI on Vercel for public-facing portals. Asks scope questions first; doesn't impose framework. Focuses on cross-functional product operations.
license: MIT
metadata:
    version: '0.1.0'
    author: airtable
---

# Product and roadmap management

Set up and run product operations workflows in Airtable -- roadmap, customer feedback, launches, OKRs, sprints, releases -- adapting to the user's team size, sub-workflow priorities, and customer shape. Ask scope before scaffolding; the same trigger can mean a 3-table solo workspace or a multi-base enterprise portfolio, and the right schema depends on what the user is actually trying to coordinate.

## Who this serves and what they're solving for

Three product-shape buckets, each with distinct personas and pain:

-   Software product team -- the obvious-looking default that's actually less than half of real-world cases. PMs, PMMs, engineering leads, designers, founders / PM-of-one. Top priorities: roadmap visibility for execs and GTM, feedback-to-feature linkage with demand signal, OKR cascade, launch coordination, capacity-vs-commitments clarity. Modal pain: tool sprawl across Productboard / Jira / Smartsheet / spreadsheets / slide decks -- _"swivel-chair work,"_ _"too many sources of truth,"_ _"PMs spending 2-3 hours/week searching and copying data,"_ _"40% of PM time answering internal roadmap questions,"_ feedback _"living in a 'black hole.'"_
-   Non-tech industry product teams. Product managers in apparel / fashion / consumer (PLM-shaped -- line plans, BOM, tech packs, sample tracking), banking / fintech / capital markets (regulated and stage-gated), pharma / biotech / medical devices (compliance-heavy), media / gaming (release-cadence and franchise portfolio), aerospace / automotive (APQP and supplier-collaborative). Top priorities: product lifecycle management with phased compliance, vendor / partner coordination via synced bases, BOM and SKU governance, ROI / IRR / NPV business-case reviews on initiatives, regulated audit-trail rollups. Modal pain: aged PLM / SoR systems that _"haven't been touched,"_ Excel sprawl with version clashes, the "translation layer" need between specialist tools and executive review, regulatory audit-trail requirements that current tools don't enforce.
-   Multi-team product ops at scale. Product Ops Leads, Directors of Product Operations, PMO directors at large product orgs, VPs of Product. Top priorities: portfolio rollup across squads, capacity-constrained planning with cut-line scenarios, cross-team dependency tracking, OKR alignment for hundreds of initiatives, mobile-friendly executive dashboards. Modal pain: _"weekend reporting marathons,"_ portfolio drift between strategic intent and operational work, _"limited Jira literacy outside Product/Engineering,"_ _"manual translation of Jira data for executives."_

Broader problems running across all three:

-   Tool sprawl and broken single source of truth. A single base often replaces 5+ tools -- PM tool + engineering tracker + spreadsheets + slide decks + email threads. The first job is often to consolidate, not just add another tool.
-   Manual reporting toil. Status updates, executive decks, weekly digests, QBR prep -- a meaningful chunk of PM time goes into producing reports a system could generate. Automating this is usually the highest-leverage early win.
-   Feedback-to-feature disconnect. Customer signal arrives across channels (NPS, support tickets, Slack, sales notes, in-app, call transcripts) but doesn't trace to roadmap decisions -- feedback _"lives in a 'black hole'"_ without a structured link from raw signal to demand-weighted prioritization.
-   Cross-functional handoffs dropping. Design -> Engineering -> Marketing -> CS handoffs lose fidelity without explicit ownership, dependencies, and shared schema.
-   Aspirational vs. deployed AI. Most customers are still piloting AI in product ops, not running it in production. Workflows should compose AI cleanly when available but work without it.

Use this to tune language and prioritization. A small-team founder cares about lightweight backlog and feedback-to-feature linkage; a non-tech industry PM cares about lifecycle / compliance / vendor coordination; a Product Ops Lead cares about portfolio rollup and capacity scenarios. Same skill, different leads.

## Before scaffolding: ask scope

Product operations cuts across software, banking, apparel, pharma, media, aerospace, energy, and many more industries -- and the "obvious" tech-product-team default fits less than half of real-world cases. Lead with three scope questions, branch from there. Don't try to ask all of them in one breath; lead with team size and sub-workflow, ask the third when the answer is load-bearing.

1. Team size and shape. Solo / small (under 10) / mid (10-50) / large (50+) / enterprise (multi-team / multi-base). Determines schema-shape default -- a 5-person team and a 200-person product org don't want the same scaffolding.
2. Which sub-workflow first. _"Roadmap, customer feedback, launch coordination, OKRs, sprint planning, or something else?"_ Determines which Work-mode playbook to load. Most users want one of these first, not all of them.
3. Customer / user shape. _"Do your product decisions track named customers and accounts (B2B), aggregate user signals across a broad base (consumer), or both (mixed / B2B2C)?"_ Determines whether the schema needs an Accounts table with ARR-weighted rollups, a Cohorts / Segments table with volume-weighted signals, or both. Frame it operationally -- what kind of data they actually track -- not as an abstract business-model label.

Branch into these when relevant -- but only when relevant:

-   Existing engineering tracker? (Jira / Linear / Azure DevOps / none.) Many airtable-product-ops setups integrate with Jira; affects sync plan and may surface the "translation layer" framing (Airtable as a human-friendly veneer over Jira for execs and GTM).
-   Migrating from a single-purpose PM tool? (Productboard / Aha / Cycle / Monday / Smartsheet / Notion / Miro.) Surfaces a migration playbook; common pattern, not edge case.
-   Public-facing surface needed? (Customer portal, external roadmap viewer, branded feedback page.) Pushes toward the custom-app build layer (see Output below).
-   Approved-vendor AI constraints? (Gemini-only, no third-party LLMs.) Real pattern in enterprise; affects which AI integrations the skill can recommend.

The three lead questions plus relevant branches usually clarify the scaffold in one round of dialogue. Don't impose a framework before listening.

## Two modes

### Setup mode: scaffold a base

When the user asks _"set up a roadmap base"_ / _"build me product ops in Airtable"_ / _"track feature requests"_, scaffold the schema via the MCP after scope is clear and the build plan is confirmed. Sequence:

1. Scope questions (above) -- read the answers; don't skip if the user dives straight to _"just build it."_ A 5-minute scope conversation beats a wrong-shape rebuild.
2. Pick a schema shape matching team size and customer shape. Five lead shapes the skill body names inline; two niche shapes available on demand.
3. Present the proposed build plan -- base name, tables, key fields, links/rollups, seed records, and any UI/custom-app handoffs. Wait for explicit user confirmation before creating or changing Airtable schema or records.
4. Build the schema via MCP -- base, typed fields, linked records, formulas, rollups, sample / seed data. The schema is the foundation everything else stands on; spend the agent's effort on richer typed fields, well-named status `singleSelect`s with thoughtful choice colors, linked-record relationships with rollup counts.
5. Hand off UI configuration for things Airtable's UI does better -- views, interfaces, automations, forms, granular permissions, sync wizards. See "Build-plan output" below for the handoff shape.
6. Build the custom-app layer when the user wants a branded UI, public-facing portal, embedded surface, or chat-bot driving the data. Optional; see `references/build-shapes.md`.

#### Lead schema shapes

The five most-common shapes -- covering the great majority of invocations. Each adapts to B2B / consumer / mixed variants (Accounts table vs. Cohorts table; ARR-weighted vs. volume-weighted prioritization; Salesforce sync vs. app-store ingestion). Full field-by-field detail in `references/schema-shapes.md`.

-   Lightweight backlog (1 table) -- a Backlog table with a long-text `Notes` field for inline notes; use Airtable's native record comments for threaded discussion. For small engineering teams that _"refuse to switch away"_ from Airtable because enterprise PM tools feel too heavy. Don't impose roadmap/feedback structure they won't use -- and don't scaffold a separate Notes / Discussion table when native comments + a long-text field cover the use case.
-   Solo / small (3 tables) -- Roadmap (Now / Next / Later), Customer feedback, Releases. The default starter when the user wants product ops without overspecifying. Add scoring (RICE) and a basic feedback-to-feature linkage with a count rollup.
-   Mid (5-6 tables) -- + Sprints, Sprint tasks, OKRs. Three-level hierarchy (OKR -> Feature -> Sprint task) matches Airtable's canonical anatomy. Stakeholder-specific interfaces (Leadership / PM / Engineering).
-   Large (canonical 7-table) -- + Team members, Customer accounts. Per Airtable's airtable-product-ops anatomy guide. Cross-base sync recommended for org-level rollups across multiple product teams.
-   Enterprise / SAFe-shaped -- + Capacity per team-quarter, Dependencies, PI staging, Cut-line scenarios. Capex / opex / ROI / IRR / NPV business-case fields on Initiatives. Multi-quarter swimlane views with permissioned drill-down.

Two niche shapes -- surface only when scope answers indicate them:

-   Stage-gate / phase-gated (banking, pharma, aerospace, CPG) -- adds a Stage-Gate table with phase definitions, Compliance Checks linked-record, Approver field per phase, audit-history rollups. Triggered by _"we need phased approvals"_ or regulated-industry signals.
-   M&A holding company (multi-company portfolio) -- adds Acquired-Companies, Deal-Pipeline scoring, External Onboarding Portal interface. Triggered by _"we operate multiple sub-companies"_ or acquisition vocabulary.

Don't impose Airtable's 7-table anatomy on a 5-person team; don't ship a 3-table MVP to an enterprise customer with 6 product squads. Pick the shape that matches the answers.

#### Build-layer decision

Setup-mode skills compose across four parallel layers (not a waterfall):

1. Schema layer (always via MCP) -- base, typed fields, linked records, formulas, seed data. The foundation; every path goes through it. Before scaffolding any base meant to be used with a specific native view or Interface component, WebFetch the relevant `support.airtable.com` doc for that surface's current schema requirements and behavior. Matching the schema to the official model prevents the "looks right but won't render" failure mode.
2. Native Airtable UX layer -- Views (Kanban / calendar / gallery / timeline / gantt / list), Interface Designer pages, Automations, Forms, granular permissions, sync setup wizards (Jira / Salesforce / Zendesk / etc.). Use the MCP where it authors today; hand off the rest as `[click here]` UI configuration steps. The boundary is a capability one, not a quality choice -- when the MCP gains support for a surface, prefer the MCP path. Inspect the registered Airtable MCP tools available through Cline for the current tool surface rather than assuming a frozen list of "what MCP does and doesn't do."
3. Airtable Portals layer (the middle path -- no-code branded external access) -- Interfaces published to external collaborators (customers, partners, vendors, contractors) through a custom-branded sign-in page. Editor / Commenter / Read-only permissions; row-level filtering by current user. Paid add-on (Team / Business / Enterprise); branded sign-in pages on Business+ and Enterprise; read-only portal users aren't billable; one portal per base. Defer to `support.airtable.com` at execution time for current plan-tier specifics rather than embedding the numbers here. Good fit for: customer feedback portals where the brand needs to be on the surface, partner-facing read-only roadmap previews, external stakeholder dashboards. Does NOT support truly public unauthenticated audiences -- portal users sign in via email invite or shareable link. For anonymous / SEO-indexed surfaces, go to layer 4.
4. Custom app layer (REST API + agent-built UI) -- Next.js / React app on Vercel, Slack / Discord / Teams bot, scheduled scripts, embedded surfaces inside the user's existing product. Use when Portals doesn't fit: truly public / unauthenticated audiences (public roadmap viewer at marketing-grade brand quality), UX beyond Interface Designer's component set (multi-step wizards, embedded charts, animations, bespoke design system), branded UX matching the customer's marketing site on their domain, embedded inside the user's existing product, or chat-driven (Slack feedback bot, Teams release-status workflows).

For external-facing surfaces, surface both Portals and custom-app options and let the user choose. Neither is a universal default. Portals is a paid add-on that saves build time when its component set fits the workflow; a custom Vercel app gives full design control and avoids the add-on if the user has the bandwidth to build and host. The user knows their constraints (budget, design needs, engineering capacity, time-to-ship) better than the skill does. Lean toward native Airtable when the user says _"I want to track X"_ or _"manage Y"_ without specifying custom UI. When the answer isn't obvious, ask -- it's a real product question, not a technical detail.

See `references/build-shapes.md` for concrete patterns: customer feedback portal on Vercel, public roadmap viewer, Slack feedback intake bot, and the Portals vs. custom-app tradeoff in more detail.

### Work mode: operate on an existing base

When the user invokes the skill against a base that already exists -- _"triage this week's feedback"_, _"prep launch comms for the Q3 release"_, _"score these feature requests"_ -- identify which sub-workflow they want, execute via MCP (filtering, scoring, updating), then hand off the result via `airtable-link`.

#### Lead sub-workflows

Ten sub-workflow shapes that cover most invocations. Each has a full playbook in `references/sub-workflows.md` -- load the relevant section on demand.

1. Roadmap and portfolio management -- initiative tracking across teams, OKR linkage, status visibility, executive dashboards. The most common invocation.
2. Voice of Customer / feedback synthesis -- multi-channel intake (NPS, support tickets, Slack, sales notes, in-app, call transcripts), categorization by product area and theme, feedback-to-feature linkage with rollup counts for demand-based prioritization.
3. Engineering-tracker translation layer -- Airtable upstream for strategy, Jira / Linear / ADO downstream for execution. Bidirectional sync at epic level; Airtable as the human-friendly veneer for execs and GTM. A common pattern when an engineering tracker is already in place.
4. Product launch / GTM coordination -- release groupings, UAT / go-live tracking with dependencies, customer approvals via forms, cross-functional task tracking, executive release-status dashboards.
5. OKR alignment and strategic planning -- initiative-to-OKR mapping, monthly portfolio rollups by exec owner, mobile-friendly dashboards.
6. Single-PM-tool replacement -- explicit migration narrative. Common displaced tools: Productboard, Aha, Cycle, Monday, Smartsheet, Notion, Miro. Frame as "rip-and-replace single-purpose PM tools," not just one competitor.
7. Capacity / resource-allocation modeling -- plan-vs-actuals capacity rollup, dependency-aware re-planning, cut-line scenarios, days-per-quarter-per-engineer.
8. Customer-facing roadmap portal -- public-facing or partner-facing roadmap views with preview / beta visibility, voting, subscriptions. Common shape, not edge case; the custom-app build layer is usually right here.
9. Idea-intake gating with structured scoring -- RICE / WSJF / Lean Canvas intake. Heavy emphasis on enforcing structured submission to prevent _"free-for-all"_ intake clutter.
10. Cross-functional release-comms automation -- auto-publish release notes to external channels, close-loop feedback notifications to original submitters, biweekly status reminders.

Plus an opt-in agent-state pattern worth surfacing when the user is explicitly building an agent-driven workflow:

11. Agent activity log pattern -- when the user describes an agent-driven workflow (recurring triage, multi-step plan, agent running over time), surface the opt-in `Agent activity log` pattern and compose the `airtable-agent-activity-log` skill to scaffold + operate it. Don't re-implement the schema inline. Pairs naturally with Airtable's role as a persistent agent substrate.

A longer tail of ~12 reference-available sub-workflows lives in `references/sub-workflows.md` (PLM-adjacent, external partner-roadmap tracking, pre-ERP staging hub, experimentation lifecycle hub, R&D participant management, executive feature-voting, SKU rationalization, sales-enablement battle cards, M&A acquisition onboarding, stage-gate governance, SAFe / PI-planning orchestration, outcomes-based roadmap with cascading key-result rollups). Load when scope surfaces them.

## Composition

This skill composes with four siblings; don't reinvent what they own.

-   `airtable-link` -- every Setup-mode build-plan ends with a base link; every Work-mode operation that touches records ends with a record / table / page link. Mandatory composition. After completing the work, return a clickable link via `airtable-link` -- hand off the most-specific URL the tool calls have proven access to.
-   `airtable-agent-activity-log` -- when the user describes an agent-driven airtable-product-ops workflow (recurring feedback triage, multi-step planning, agent running over time, _"the agent should propose changes for me to approve,"_ _"agent log of how we got to this prioritization"_), surface the opt-in `Agent activity log` pattern and compose this skill to scaffold + operate it. Pass through the workflow's record-touching tables (Roadmap, Customer feedback, Releases, OKRs, etc.) so the per-target linked-record fields scaffold correctly. Don't re-implement the schema inline.
-   `airtable-filters` -- when Work-mode operations slice records (triage queues, _"find P0 features"_, capacity rollups), compose the filter syntax through this skill rather than re-deriving it.
-   `airtable-overview` -- load only when the user shows confusion about basic data-model concepts (base / table / record / interface page). Most users don't need this; pulling it in by default wastes tokens.

## Permission-aware behavior

The MCP user's auth determines which URLs the user can actually open. Respect the scope the tool calls have proven:

-   Page-restricted users (interface-only access via Airtable's permission model) -- hand off interface page URLs only. A `tbl_*` URL the user can't open is a dead link from their perspective.
-   Table-level access -- table URLs are safe.
-   Workspace-level access -- workspace URLs are safe.

Standing rule: if a tool call didn't prove the access surface, don't link to it. When in doubt, drop one specificity level. The `airtable-link` skill enforces this when handing off URLs.

## Build-plan output

Three output shapes, depending on which layers apply. Pick what matches what the user actually asked for -- don't over-build (no custom app for _"track my projects"_) and don't under-build (no UI-step list when they asked for _"a customer-facing portal"_).

Before listing items in any `Configure in Airtable` or `Configure Portal` block below, inspect the registered Airtable MCP tools available through Cline for current support -- if the MCP now authors a surface you'd otherwise hand off (view, Interface page, Automation, Form, etc.), use the MCP path instead. The MCP's capability boundary is moving fast; what's a UI handoff today may be MCP-driven tomorrow.

Pure Airtable (most common -- user wants the native experience):

```
✅ Built (via MCP):
  - [Base name] with [N] tables, [N] fields, linked records, [N] seed records
  - View in Airtable: [base link]

🎨 Configure in Airtable:
  - [Specific Kanban / calendar / gallery view] -- [click here]
  - [Specific interface page for the right stakeholder audience] -- [click here]
  - [Specific form / automation] -- [click here]
```

Airtable + Portals (user wants branded external access for customers / partners / vendors without building a custom app):

```
✅ Built (via MCP):
  - [Base + schema]
  - View in Airtable: [base link]

🌐 Configure Portal:
  - Enable Portal on the [Customer feedback intake / Partner roadmap] interface -- [click here]
  - Customize branded sign-in page (logo + background) -- [click here]
  - Invite first portal guest(s) -- [click here]

🎨 Configure in Airtable:
  - [Admin interface page for internal triage] -- [click here]
  - [Automation tying portal events to internal workflow] -- [click here]
```

Airtable + custom app (user wants a public-facing roadmap, marketing-grade brand, embedded surface, or chat-surface bot on top):

```
✅ Built (via MCP):
  - [Base + schema]
  - View in Airtable: [base link]

🛠️ Custom app:
  - [Next.js portal at vercel-deploy-url]
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

-   Don't default to a tech-product-team frame. Industry diversity is the rule. Banking, apparel, pharma, media, aerospace, energy all run product ops in Airtable. Probe broadly before assuming "product" means "software product."
-   Don't assume the user has Jira. A significant minority do, not the majority. Build the schema first; ask about engineering-tracker integration as a follow-up branch.
-   Don't assume Slack. Microsoft Teams is more common in healthcare, auto, EU enterprise, and many large non-tech orgs.
-   Don't lead with feature flags or experimentation. Those workflows live in dedicated platforms (Statsig, LaunchDarkly) and are essentially absent from real airtable-product-ops Airtable setups. Stick to roadmap, feedback, launch, OKRs, capacity.
-   Don't assume Claude or OpenAI access. Approved-vendor LLM constraints are real (Gemini-only, no third-party LLMs in some enterprises). Ask before recommending an AI integration tied to a specific provider.
-   Don't undersize the lightweight case. A real archetype is the 5-person team with a single backlog table -- pushing the canonical 7-table schema on them is overcorrection.
-   Use MCP for what it currently supports; hand off the rest as `[click here]` UI steps. Inspect the registered Airtable MCP tools through Cline at execution time rather than assuming what it does or doesn't author. The boundary is a capability one (and closing over time), not a quality choice -- don't frame the handoff as "the UI does this better."
-   Don't push the REST API tier unless the user actually needs it. Native Airtable handles most airtable-product-ops shapes well. The custom-app layer is the right answer when the user wants something public-facing, branded, embedded, or chat-driven -- not when they want _"a roadmap base."_

When in doubt about which path to take, ask. Two scope questions cost ten seconds; rebuilding the wrong shape costs an hour.
