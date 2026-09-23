# Build shapes: pure Airtable vs. Airtable + custom app

Concrete patterns for the two output shapes from `SKILL.md` -- when each fits, what the deliverable looks like, and the airtable-sales-ops-specific custom-app patterns. Load when the build-layer choice is non-obvious.

Before listing items in any `Configure in Airtable` or `Configure Portal` block in this file, inspect the registered Airtable MCP tools available through Cline for current support -- if the MCP now authors a surface you'd otherwise hand off (view, Interface page, Automation, Form, etc.), use the MCP path instead. The MCP's capability boundary is moving fast; what's a UI handoff today may be MCP-driven tomorrow.

## When pure Airtable is the right answer

Most _"set up a CRM"_ / _"build a sales pipeline"_ invocations land here. The schema layer (via MCP) plus native Airtable UX (handed off as `[click here]` configuration steps) covers the workflow cleanly.

Signals the user wants pure Airtable:

-   _"I want to track deals"_ / _"manage accounts"_ / _"set up a pipeline"_ -- no UI specification
-   _"Move from spreadsheets"_ / _"replace HubSpot"_ -- they want the same workflow with more flexibility, not a new UX
-   _"Internal-facing"_, _"for my sales team"_, _"for our AEs"_ -- the audience is inside the org
-   Time pressure / _"just build it"_ -- pure Airtable ships faster

Stick with pure Airtable unless the user explicitly asks for a custom surface. External-collaborator access (partner / vendor / contractor / client portals) is also handled by Airtable natively -- see the Portals section below.

### Deliverable shape

```
✅ Built (via MCP):
  - [Base name] with [N] tables, [N] fields, linked records, [N] seed records
  - View in Airtable: [base link]

🎨 Configure in Airtable:
  - [Specific Kanban / calendar / gallery view, e.g. "Kanban on Opportunities grouped by Stage"] -- [click here]
  - [Specific Interface page for the right stakeholder audience, e.g. "Forecast dashboard for sales leadership"] -- [click here]
  - [Specific form / automation, e.g. "Form for inbound lead intake" or "Round-robin lead assignment automation"] -- [click here]
```

Pick the 1-3 most-impactful handoffs for the workflow shape. Don't enumerate every possible view.

### Native Airtable UX surfaces (handoff targets)

When the user wants Airtable's native experience, these surfaces are best configured in the UI directly:

-   Views -- Kanban (on Opportunities by Stage; on Leads by Status), calendar (Activities; Renewals), gallery (Accounts with logos), timeline / gantt (Opportunity stages over time), grid (filtered triage queues). Drag-and-drop with live preview.
-   Interface Designer pages -- sales dashboards (forecast rollups, top deals, at-risk accounts), record-review pages (Account 360, Opportunity 360), deal-desk triage, partner-pipeline rollups, executive read-only summaries.
-   Automations -- visual trigger-action builder. Stage-change notifications, round-robin lead assignment, renewal alerts (3/2/1-month triggers), conditional handoff guards, Slack notifications on Closed-Won.
-   Forms -- drag-and-drop with conditional logic and custom branding. Lead intake forms, partner registration, deal-desk request submission, customer reference requests.
-   Granular permissions -- base / table / field / record / interface-level access controls. Common patterns: row-level access for reps to see only their accounts; territory-based view restrictions; read-only access for stakeholders.
-   Sync setup wizards -- Salesforce, HubSpot, Slack, Snowflake, Jira. The UI walks the user through OAuth and table mapping; doing this via API is significantly more work.

## Airtable Portals as one external-collaborator path

For partner / vendor / contractor / client portals -- "external users sign in to see and update their slice of the base" -- Airtable Portals is Airtable's first-party option. Interface-based, with custom branded sign-in (logo + background image on Business / Enterprise Scale), guest-user access at Read-only / Commenter / Editor levels, and reduced Airtable-specific chrome for guests. Surface it as an option alongside custom-app builds; let the user choose based on their constraints.

Portals fits well when:

-   The interactions fit Interface Designer's component set (record review, dashboards, lists, kanban, calendar, gallery, forms, grid)
-   The user wants to ship fast (days rather than weeks)
-   Branded sign-in (logo + background) is sufficient brand customization
-   The add-on pricing works for their situation
-   They don't want to maintain a separate custom app

Portals constraints worth surfacing:

-   It's a paid add-on -- Team and Business tiers both have it as an add-on; Enterprise as a feature. Some customers prefer to avoid the add-on cost and build custom instead.
-   One portal per base (multiple Interfaces shareable within that single portal)
-   Portal editors are billable; read-only guests are not
-   Branded sign-in (logo + background) is available on Business / Enterprise Scale
-   Verify current pricing and feature gating at execution time

If the user wants a fully custom design, no add-on dependency, embedded surfaces inside an existing product, or other patterns beyond what Interface Designer expresses, the custom-app path below is equally valid.

### Deliverable shape

```
✅ Built (via MCP):
  - [Base + schema]
  - View in Airtable: [base link]

🌐 Configure Airtable Portal:
  - Enable Portal on the [base name] -- [click here]
  - Branded sign-in: logo + background (Business / Enterprise Scale) -- [click here]
  - Share [Partner Pipeline interface] to portal guests at Editor permission -- [click here]
  - Share [Partner Dashboard interface] to portal guests at Read-only -- [click here]

🎨 Configure in Airtable (internal):
  - [Admin Interface page for sales-team triage of incoming portal activity] -- [click here]
  - [Automation, e.g. "Notify channel manager when partner submits a deal registration"] -- [click here]
```

### Concrete airtable-sales-ops Portal patterns

Partner registration / management portal

-   Portal published on the base, with a `partners.example.com` (or similar) branded entrypoint
-   Partners sign in, see their assigned accounts, deal registrations, joint plans
-   Permissions scoped via row-level Interface filters and current-user matching
-   Internal channel team triages new partner registrations via a separate internal Interface
-   No custom code; entirely Airtable-native

Vendor / carrier directory portal

-   Vendors sign in to confirm their own annual verification record
-   Read mostly + Edit their own contacts + Submit form to update appetite
-   Side-by-side review interface for the internal team to approve changes

Contractor / consultant portal

-   External contractors sign in to see assigned projects, log time, submit deliverables
-   Internal team sees aggregated view across all contractors

Client / customer portal (B2B services)

-   Clients sign in to see their account status, open deals, deliverables, recent reports
-   Common in agency, professional services, financial advisory verticals

## Airtable + custom Vercel app as another external-collaborator path

When the user wants a custom-built experience -- for any reason, including budget constraints around add-ons, full design control, or workflow needs beyond Interface Designer -- the custom-app path is equally legitimate. Build it.

Custom app fits well when:

-   The user wants full design control (custom domain, brand-matching design system, animations, freeform layouts) without the constraints of Interface Designer's grid + component set
-   The user wants to avoid the Portals add-on cost
-   UX needs go beyond what Interfaces / Forms / Dashboards can express -- multi-step wizards with deep branching, custom drag-and-drop, embedded interactive charting libraries (Recharts, Victory, D3), animations / transitions / motion
-   Server-side compute is needed before display -- LLM-summarized records, inline enrichment API calls, custom computation that can't live in formula fields or Automations
-   The surface needs to be embedded inside the user's existing product -- sales-team admin dashboard inside an internal tools app, embedded forecast surface in a finance dashboard, data surfaced inside a customer-facing portion of the user's product
-   The channel is chat-driven -- Slack / WhatsApp / Teams / Discord bots
-   Multi-tenant patterns where each external customer sees a different slice on their own subdomain / domain with different branding (beyond what one-portal-per-base can model)
-   The user explicitly says _"build a Next.js app on our domain with our design system"_ rather than _"give partners a portal"_

When the choice between Portal and custom app isn't obvious, mention both and let the user pick. _"Two paths for this: Airtable Portals -- Interface-based with branded sign-in, fast to ship, paid add-on. Or a custom Next.js / Vercel app reading Airtable via REST API -- full design control, no add-on, more to build and maintain. Either works; which fits your situation?"_

### Deliverable shape

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
  - [Admin interface page for sales-team triage] -- [click here]
  - [Automation tying app to base events, e.g. "Slack notification when partner submits registration"] -- [click here]
```

### Concrete airtable-sales-ops custom-app patterns

> Note on partner / vendor / contractor portal patterns: these are now Portal-first by default -- see the "When Airtable Portals is the right answer" section above. The custom-app patterns below are for cases Portals genuinely can't cover.

Slack deal-log bot

-   Slack app that listens for messages in `#sales-activity` channel, or processes `/log-deal` slash commands, or processes emoji reactions on existing messages
-   On trigger: extracts deal context (rep, account, outcome), POSTs to Airtable Activities table
-   PAT scoped to `data.records:write` + `schema.bases:read` for the target base
-   Hosted on Vercel serverless functions or Cloudflare Workers
-   Useful for high-velocity sales teams that live in Slack and don't want to context-switch to Airtable

WhatsApp / SMS B2C CRM with rotating external agents

-   WhatsApp Business API + Airtable backend
-   Customer messages flow into Airtable as records (or as comments on existing Customer records)
-   External / rotating agents respond via an Interface page or via WhatsApp directly
-   Suitable for: B2C lead-management at high volume with low rep cost; high-touch B2C in markets where WhatsApp is the dominant channel; campaigns with rotating field-agent rosters

Embedded sales-team admin dashboard inside an existing product

-   React components in the user's existing app (internal admin tool, customer dashboard) that read from Airtable via REST API
-   Authenticates the end-user through the user's existing auth; uses a server-side proxy to make Airtable calls (don't ship PATs to the browser)
-   Real-time-ish updates via polling or webhook-driven cache invalidation
-   Useful for product-led-growth teams where the airtable-sales-ops surface should live inside the user's product

Public RFP-response portal

-   For most cases, Airtable Portals is the right answer -- vendors / suppliers sign in to the branded portal, see their assigned RFPs, submit responses via Interface forms. Use the Portal path unless the workflow demands tokenized-link access for unauthenticated respondents (e.g., one-off RFPs going to vendors who shouldn't need to create an account).
-   Custom Vercel app variant (when tokenized-link / unauthenticated access is required): Next.js app on a custom domain where respondents land via tokenized email links, view their assigned RFP without signing up, submit responses. Writes to an RFP Responses table via REST API. Useful for one-off public-sector tenders or single-pass vendor surveys.

Customer reference self-serve portal

-   Internal-facing tool -- Airtable Interfaces are usually sufficient when the audience is internal AEs (filter / search the Reference DB, submit use requests).
-   Custom Vercel app variant (when the team genuinely needs UX beyond Interfaces -- e.g., embedded inside an existing internal tools app, or with custom search ranking on top of the Reference DB): internal-facing Next.js app with SSO, custom search filters, ranking algorithms, embedded inside the existing toolchain.

### REST API reference

Use [`airtable.com/developers/web/llms.txt`](https://airtable.com/developers/web/llms.txt) as the agent-readable index for the Airtable REST API -- 70+ endpoints, 30+ data models, guides. Covers patterns the MCP doesn't: scoped PATs, OAuth flows for end-users, webhooks, sync sources, comments, scripts, fine-grained permissions.

### Patterns that need the custom-app layer specifically

These don't fit Interface Designer or Forms cleanly:

-   Multi-step wizards with branching logic that depends on previous answers (more than what conditional fields in Forms can express)
-   Custom drag-and-drop or freeform layout (Interfaces use a fixed grid)
-   Embedded interactive charts using a specific charting library (Recharts, Victory, D3) the user's design system uses
-   Animations, transitions, or motion the user's brand calls for
-   Multi-tenant access patterns where each end-user sees a different slice (Interface Designer supports row-level permissions but the configuration is brittle at multi-partner scale)
-   Server-side computation before display (e.g., running an LLM call to summarize records before rendering them, or pulling external enrichment data inline)

When the user describes one of these explicitly, go straight to custom-app. When the user describes their need at a workflow level (_"partners should be able to update their pipeline"_), the default path is Airtable Portals -- see the Portals section above. Fall through to custom-app only when Portals + Interfaces can't deliver the specific requirement.

## Hybrid shapes

Combining multiple layers in one deliverable is normal -- e.g., an Airtable Portal for external partners plus an internal triage Interface for the channel team, plus a Slack bot for activity logging. The output shape lists each:

```
✅ Built (via MCP):
  - [Base + schema]
  - View in Airtable: [base link]

🌐 Configure Airtable Portal (external partners):
  - Enable Portal on the base -- [click here]
  - Branded sign-in (logo + background) -- [click here]
  - Share the [Partner Pipeline interface] to portal guests at Editor -- [click here]

🎨 Configure in Airtable (internal):
  - Channel-team triage Interface page -- [click here]
  - Automation: notify Slack when portal guest submits a registration -- [click here]

🛠️ Optional custom app (only if needed):
  - [Slack deal-log bot for the internal sales team]
  - PAT scoped to data.records:write on the Activities table
```

Don't force the user into one layer when multiple layers serve different audiences.

## Salesforce-augmenting shape (special case)

When the user has Salesforce and wants Airtable as the agile UI / staging / pre-CRM / post-CRM layer, the output shape includes the sync setup. See `references/integrations.md` for the per-tool framework (native sync, Salesforce Automation Actions, HyperDB sync for very large datasets, REST API fallback, MCP).

```
✅ Built (via MCP):
  - [Base name] with [N] tables for what the CRM doesn't model -- Deal Desk, Reference DB, etc.
  - Synced from Salesforce: Accounts, Contacts, Opportunities (via native sync; read-only on the Airtable side)
  - View in Airtable: [base link]

🔄 Configure CRM sync (look up current mechanics at execution time):
  - Native Salesforce -> Airtable sync -- [setup wizard]
  - Write-back via Salesforce Automation Actions (Airtable's native Create record / Update record actions inside Automations) for [specific writeback fields]
  - For very-large datasets (millions of records), evaluate the HyperDB Salesforce integration instead

🎨 Configure in Airtable:
  - [Deal Desk triage Interface page] -- [click here]
  - [Automation for stage-change push-back via Salesforce Automation Actions] -- [click here]
```

Expectations to set with the user up front (conceptual, not version-specific):

-   The native Salesforce sync is one-way (Salesforce -> Airtable). This is the design, not a bug -- Salesforce stays the system of record. Many customers initially expect bi-directional native sync; clarify the architecture before scaffolding.
-   Bi-directional is achieved via Salesforce Automation Actions -- a first-party native feature inside Airtable Automations, not a custom REST API hack. The actions support common operations like create and update on standard Salesforce objects.
-   For very-large datasets, the native sync's row capacity may not be enough. HyperDB's Salesforce integration is designed for orders-of-magnitude-larger volumes with a lower-frequency sync cadence -- evaluate this path at multi-million-record scale.
-   Sync source choice matters -- the native Salesforce sync pulls from a Salesforce _report_, not the raw object. Filter the report carefully because filter changes in SFDC can delete corresponding records in Airtable; budget time during setup to pick the right report definitions.
-   Permission alignment -- Airtable only sees the SFDC records the configured user has access to. Use a service account or power user for syncs that need to cover full pipeline.

For current sync direction, cadence, row / column limits, plan-tier requirements, supported field types, and supported objects per Automation Action -- look up the current support documentation at execution time rather than relying on cached specs. The integration evolves and the support docs are authoritative. See `references/integrations.md#salesforce` for the lookup framework.
