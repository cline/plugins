# CRM and sales-stack integrations

Per-tool guidance for connecting Airtable to (or migrating from) sales tools. Load the section that matches what the user has, or wants to integrate.

## Why customers integrate vs. migrate

Sales operations is dominated by integration patterns, not migration: most customers running CRM workflows in Airtable do so alongside an existing CRM (Salesforce, HubSpot) rather than instead of it. The pain points behind these integrations are consistent -- CRMs feel heavy or rigid for the team's agile deal flow, reps end up in spreadsheets to escape CRM-UI friction, deal execution stretches across many systems, per-seat CRM licensing limits how widely the CRM gets deployed, CRM literacy outside the core sales team is limited, and forecasts get rolled up by hand from too many sources. Airtable's value-prop is being the agile UI / staging / pre-CRM / post-CRM layer where workflows the CRM doesn't model well (deal desk, customer reference DB, sales engineering capacity, partner CRM, RFP / tender pipeline) get a proper data model linked to the CRM's records.

When a user mentions they have a CRM, the skill should help them consolidate -- most often via the augment pattern (sync the CRM's records in; layer native Airtable tables for what the CRM doesn't model; push back to the CRM via Automations or REST API when needed). Follow the user's lead. Some customers want a full replacement (common at smaller scale or in non-tech verticals); others want a lightweight CRM for a sub-team while the main CRM stays as system of record; others want a read-mostly UI layer for license reduction. All are valid; surface the options and let the user choose.

For tools the user is migrating from (smaller CRMs being displaced, work-tracking spreadsheets, vertical legacy tools), the same per-tool lookup pattern applies -- the migration mechanics live in vendor documentation, not in this file.

## How this file is structured

Each tool's section gives durable conceptual guidance -- the data-model mapping, what to preserve vs. reshape, what Airtable layer fits where. This content stays accurate as the vendors evolve their APIs and pricing.

For current integration mechanics (which API endpoints exist today, which pricing tiers gate them, what the current UI calls things, current rate limits), the skill should look up live documentation at execution time across these four categories. Native Airtable sync and MCP are complementary -- sync wins when the use case is "data should live in Airtable as relational records the team builds on top of"; MCP wins when the use case is "the agent queries the tool on demand and the source-of-truth stays in the source tool":

1. Airtable native sync integration -- does Airtable have a sync source for this tool? When it exists and the use case is "this data should be part of Airtable's relational layer," sync is the highest-leverage path because the data becomes a proper Airtable table -- composable with Interfaces, formulas, rollups, Automations, linked records to native Airtable tables, and the rest of the platform. Look up: [`airtable.com/integrations`](https://www.airtable.com/integrations), the [Airtable Sync setup support article](https://support.airtable.com/docs/sync-overview-articles), or the vendor's Airtable-integration documentation. Note: some vendors integrate from THEIR side rather than Airtable's (e.g., HubSpot Data Sync, HubSpot Workflows) -- check both.
2. Source-tool MCP server -- most major sales vendors shipped MCP servers in the 2026 wave (Apollo, ZoomInfo, Outreach, HubSpot, Amplemarket, Clay, Gong, Granola, Salesloft+Clari, and growing). When an MCP server exists and the use case is "the agent queries this tool on demand" -- research, enrichment, transcript pulls, ad-hoc lookups -- MCP is the lowest-friction path. MCP also wins on UX friction: setup is typically a one-time OAuth flow through the agent's connectors store, with no API key generation, no manual scope configuration, no PAT-rotation policy to manage. The user signs in once with their existing vendor credentials and the agent has access; the team avoids the "go to vendor's developer console, generate a key, restrict it, paste it into Airtable Automations" loop that a REST API path requires. Look up: vendor's MCP documentation, Claude's connectors store, [`mcp-servers.org`](https://mcp-servers.org) or equivalent registry, and the vendor's GitHub for community MCP servers.
3. Source-tool REST API / write-back mechanics -- used when MCP doesn't cover the action or sync doesn't cover the direction. For Salesforce specifically, also check Airtable's native Salesforce Automation Actions (Create record / Update record actions inside Airtable Automations -- the official native write-back path, no custom REST API code needed). Look up: vendor's developer documentation (typically `developer.<vendor>.com`); check authentication mechanism (OAuth / PAT / API key), rate limits, pricing-tier gates, and the specific endpoints for the entities being integrated.
4. Source-tool webhooks / triggers -- useful for real-time change capture into Airtable when MCP / sync don't fit. Look up: vendor's webhook documentation; typically subscribed at workspace / org level.

Choosing between sync and MCP (when both exist): native sync if the team wants the data composable with the rest of Airtable (linked records, rollups, Interface dashboards, Automations triggered by the synced data); MCP if the team wants on-demand agent access without bringing the data into Airtable's storage / record count / governance footprint. Many teams use both -- sync for steady-state record alignment, MCP for agent-driven research / enrichment / ad-hoc queries.

Specific search prompt template for the agent (parameterize the tool name):

> _"Find current documentation for integrating Airtable with `<TOOL>`: (a) does Airtable have a native sync integration for `<TOOL>` -- what's its current sync direction, cadence, plan tier, row / column limits? (b) does `<TOOL>` expose a REST API for write-back, what auth, what pricing tier, what rate limits? Is there a native write-back action inside Airtable Automations (e.g., Salesforce Automation Actions)? (c) does `<TOOL>` support webhooks for change events? (d) is there a `<TOOL>` MCP server (official or community)?"_

The agent then picks the path that fits the user's scale, access level, and bi-directional needs.

## Salesforce

The dominant CRM in the Airtable footprint at scale. The integration story is rich enough to deserve four parallel paths, all of which are first-class.

### Conceptual mapping

-   Native Salesforce sync (Salesforce -> Airtable, read-only on the Airtable side) -- pulls Salesforce report data into a synced Airtable table. Best for: read-mostly Airtable surfaces (forecast dashboards, exec read-only views, license-reduction patterns where stakeholders consume SFDC data without paying for SFDC seats). _Look up at execution time_: current sync direction, cadence, plan tier, row / column limits, supported field types -- these have evolved and will continue to evolve. Source: [`support.airtable.com/docs/airtable-sync-integration-salesforce`](https://support.airtable.com/docs/airtable-sync-integration-salesforce).
-   Salesforce Automation Actions (the native write-back path) -- Airtable Automation steps that create or update Salesforce records. First-class native feature; no custom REST API code required. Best for: bi-directional Airtable + Salesforce setups where critical Airtable changes need to flow back to SFDC (stage moves on Airtable-driven deals, new opportunity records spawned from Airtable forms, account-level updates flowing to SFDC). _Look up at execution time_: which Salesforce objects are supported, plan-tier gating, current limitations. Source: [`support.airtable.com/docs/salesforce-automation-actions`](https://support.airtable.com/docs/salesforce-automation-actions).
-   HyperDB Salesforce integration -- Enterprise-scale sync for very large Salesforce datasets (orders of magnitude beyond the regular sync's row capacity). Best for: organizations with millions of Salesforce records (claims, transactions, accounts at very-high-volume scale) that need them queryable inside Airtable. Cadence is much lower than regular sync (typically nightly). _Look up at execution time_: current scale limits, supported Salesforce objects, plan-tier requirements. Source: [`support.airtable.com/docs/salesforce-integration-for-hyperdb-in-airtable`](https://support.airtable.com/docs/salesforce-integration-for-hyperdb-in-airtable).
-   Custom REST API + Automations -- fallback when the native paths don't cover the use case (custom Salesforce objects not in the native action list, edge-case auth scenarios, batched bulk operations). Use Airtable Automations' "Run script" action calling SFDC's REST API with stored credentials. Source: Salesforce's developer documentation.

### Common Salesforce integration shapes

-   One-way sync into Airtable + UI on top -- read-mostly Airtable surface for non-SFDC users (execs, finance, marketing, ops). Cheapest path; Salesforce stays as system of record.
-   Read-from-sync + write-back via Automation Actions -- Airtable as the agile UI for the sales team; SFDC stays as SoR; specific field changes (Stage, Next action, Notes) push back via Automation Actions. Most common bi-directional shape.
-   Pre-CRM staging -- dirty inbound leads land in Airtable from forms / partners / enrichment; an Automation evaluates qualification rules and pushes only the qualified records into SFDC via Automation Actions. Keeps the CRM clean.
-   Post-sale ops handoff -- Closed-Won opportunities in SFDC sync to Airtable; downstream ops workflows (install, project, billing) live in native Airtable tables linked to the synced opportunity records.
-   License-reduction UI -- Airtable Interface pages display SFDC data via sync for stakeholders who can't justify per-seat SFDC licensing. Writes happen in SFDC by the rep audience; reads happen in Airtable for everyone else.
-   HyperDB-backed analytics -- million-record SFDC datasets in HyperDB; Airtable as the analytical layer with embedded interface views.

### Salesforce-specific stumbling blocks

-   Sync direction expectations -- many customers initially expect native bi-directional sync. Set expectations up front: native sync is read-into-Airtable; write-back is via Automation Actions (which IS native, but it's a separate Automation flow, not part of the sync).
-   Salesforce reports as the sync source -- the regular sync pulls from a Salesforce _report_, not the raw object. Filter the report carefully -- changing the filter in SFDC will delete corresponding Airtable records.
-   Permission alignment -- Airtable will only see the SFDC records the configured user has access to. Use a service account or a power user for syncs that need to cover the full pipeline.
-   Joined reports -- historically unsupported by the sync; check current docs.
-   Workato / MuleSoft / iPaaS layers -- some enterprises route Airtable+SFDC integration through their existing iPaaS rather than using Airtable's native paths. When the user mentions an iPaaS, defer to the iPaaS rather than building parallel sync paths.

### Look up at execution time

-   Current Salesforce sync limits (rows, columns, supported field types, cadence)
-   Current plan-tier gating for native sync and Automation Actions
-   Which SFDC objects Salesforce Automation Actions currently supports
-   HyperDB sync's current scale + supported objects + plan tier
-   Salesforce REST API current version, auth flows, rate limits
-   Salesforce MCP server (if Salesforce ships one -- they may by the time this skill runs)
-   Airtable's current Salesforce-integration documentation index

## HubSpot

Second most common CRM in the Airtable footprint, especially below Enterprise. The integration story is different from Salesforce: the integration is driven from HubSpot's side, not from Airtable's sync menu, and includes a bidirectional option that Airtable's native Salesforce sync doesn't have.

### Current HubSpot ↔ Airtable integration paths

Verified via `support.airtable.com/docs/integrating-hubspot-with-airtable` -- look up the current state since this evolves:

-   HubSpot Data Sync -- bidirectional sync between a HubSpot hub and an Airtable base. Supports Contacts and Companies (verify current object coverage and whether further objects have been added). Verify current GA status, plan tier, and pricing at execution time -- this surface was rolled out incrementally and tier gating evolves.
-   HubSpot Workflows -- one-way HubSpot -> Airtable. When a trigger fires in HubSpot, a record is created or updated in Airtable. Changes made in Airtable do NOT flow back to HubSpot through this path. Useful when HubSpot is the system of record and Airtable is downstream.
-   HubSpot has an MCP server (per the broader sales-vendor MCP wave covered in the AI-native stack section below). Use the MCP for agent-driven workflows; use Data Sync for steady-state bidirectional record flow.

### Conceptual mapping

-   HubSpot Companies -> Airtable Accounts table
-   HubSpot Contacts -> Airtable Contacts table
-   HubSpot Deals -> Airtable Opportunities table
-   HubSpot Engagements (calls, emails, meetings) -> Airtable Activities table
-   HubSpot Custom Properties -> typed Airtable fields
-   HubSpot Workflows -> Airtable Automations (1:1 translation usually)
-   HubSpot Reports -> Airtable Interface pages or views

### Common HubSpot integration shapes

-   Replacement -- smaller teams find HubSpot too expensive at scale or too rigid for vertical use; full migration to Airtable is a real path. HubSpot per-seat licensing escalates quickly at moderate user counts.
-   Augmentation via HubSpot Data Sync -- HubSpot stays as system of record for marketing-driven flows; Airtable layers above for cross-channel coordination, deal desk, reference DB. Two-way sync keeps Contacts and Companies aligned.
-   Pre-HubSpot staging -- dirty leads land in Airtable, get qualified, then push to HubSpot via Data Sync.

### Look up at execution time

-   Current HubSpot Data Sync state (still beta? GA? supported objects expanded?)
-   HubSpot REST API specifics: auth (OAuth / Private Apps), rate limits, pricing-tier gates on API access
-   HubSpot webhooks for change events
-   HubSpot MCP server's current capability surface
-   Clearbit / Breeze Intelligence's current state (Clearbit was acquired by HubSpot; some APIs being deprecated)

## Pipedrive

Smaller CRM, often migrated FROM. Less common as an integration partner.

### Conceptual mapping

-   Pipedrive Deals -> Airtable Opportunities
-   Pipedrive Persons -> Airtable Contacts
-   Pipedrive Organizations -> Airtable Accounts
-   Pipedrive Activities -> Airtable Activities
-   Pipedrive Pipelines / Stages -> Airtable status singleSelect (often consolidate multiple Pipedrive pipelines into one Stage field with a Pipeline tag)
-   Pipedrive Custom Fields -> typed Airtable fields

### Common shape: migration

Pipedrive customers often outgrow Pipedrive's flexibility (vertical-specific schema needs, multi-team coordination, reference DBs) -- migration to Airtable is the most common pattern. Smaller customers stay; mid-market customers migrate.

### Look up at execution time

-   Native Airtable sync for Pipedrive? (Probably no; verify.)
-   Pipedrive REST API for export
-   Pipedrive webhooks
-   Pipedrive MCP server

## Zoho / Close / Copper / Microsoft Dynamics / smaller CRMs

Tail-of-CRM-market tools. Almost always migrate-from cases, not integration cases. Schema mapping follows the same pattern as Pipedrive (Deals -> Opportunities, Contacts -> Contacts, Organizations -> Accounts, Pipelines -> status fields).

For Microsoft Dynamics specifically, customers often have it as part of their broader Microsoft stack (Teams + Outlook + SharePoint + Dynamics). When migrating off Dynamics, plan for the cross-stack dependencies -- Teams notifications and Outlook calendar syncs may need to be re-wired.

Look up at execution time for each: native sync? REST API for export? Webhooks? MCP server?

## Sales engagement (Outreach / Salesloft / Apollo / Reply.io)

Sales engagement platforms handle email cadences, multi-channel outbound, and sales rep productivity. Largely absent from the Airtable footprint at this time. Most Airtable airtable-sales-ops customers do NOT have these tools in place -- be careful not to assume they do.

### When to integrate

When the user mentions Outreach, Salesloft, Apollo, or Reply.io, they likely use the tool for the actual outbound sequencing and want Airtable for the upstream lead management (lead lists, ICP scoring, account research) and downstream pipeline (post-meeting opportunity tracking). The integration shape:

-   Push from Airtable -- qualified leads or accounts in Airtable trigger outbound sequences in the engagement tool. Via the engagement tool's REST API or webhook trigger.
-   Pull engagement data into Airtable -- meeting bookings, email engagement signals, sequence outcomes flow back to Airtable for pipeline-level reporting. Via the tool's webhooks or scheduled pulls.

### Considerations

-   Deliverability -- Airtable Automations can send email but lack the deliverability infrastructure (warmup, sender reputation, IP rotation, link tracking) these platforms have. For outbound at scale, push to the engagement tool rather than sending from Airtable.
-   CAN-SPAM / CASL compliance -- engagement platforms have unsubscribe management, suppression lists, jurisdiction-aware compliance. Don't reimplement in Airtable.

### Look up at execution time

-   Native Airtable sync for Outreach / Salesloft / Apollo / Reply.io? (Probably not; verify.)
-   Their REST APIs for bidirectional record push
-   Their webhooks for engagement events
-   Their MCP servers (Salesloft / Clari merger context may shift the landscape)

## Revenue intelligence / conversation intel (Gong / Chorus / Clari / Boostup)

Call recording and conversation-intelligence tools. Most-asked-for missing integration -- many customers want this; few have it shipped. Be careful: customers may ASK for it before having it in place. Confirm they have the tool subscribed before recommending integration patterns.

### When to integrate

-   Transcript ingestion into Airtable -- Gong / Chorus transcripts pushed to Airtable as records, with metadata (deal, attendees, date). Useful for VoC analysis, MEDDIC field extraction, account-brief generation.
-   Signal extraction -- Gong's risk / competitor / next-step signals push to Opportunity records in Airtable for visibility outside the conversation-intel tool.

### Considerations

-   Transcript volume -- at scale (10k-100k transcripts/year), HyperDB or selective sync may be more appropriate than the regular sync.
-   AI processing latency -- AI extraction of MEDDIC fields or sentiment from transcripts is asynchronous; design the Airtable schema with pending / processed states.
-   Cost -- transcript processing has token / API costs; budget for them.

### Look up at execution time

-   Native Airtable sync for Gong / Chorus / Clari / Boostup? (Verify; Salesloft + Clari merger may have created new sync surfaces.)
-   Their REST APIs for transcript and signal export
-   Their webhooks
-   Their MCP servers

## Data + enrichment (ZoomInfo / Apollo / Clearbit / LinkedIn Sales Navigator)

Data providers and lead-enrichment platforms. ZoomInfo dominates enterprise; Apollo serves SMB; Clearbit was acquired by HubSpot (now "Breeze Intelligence") with some APIs deprecating; LinkedIn Sales Navigator pairs with a data layer for verified contact info.

LinkedIn note: Airtable has a native LinkedIn integration on its sync sources list. Verify the current capability scope (it may be activity / connection / messaging-shaped rather than full Sales Navigator data). Useful for capturing LinkedIn-sourced touchpoints into Airtable as activity records.

### MCP coverage (significant 2026 update)

-   ZoomInfo MCP server -- exists; exposes account- and contact-level find / enrich / research operations. OAuth setup typically via the agent's connectors store. Requires a ZoomInfo subscription (enterprise pricing). WebFetch ZoomInfo's MCP documentation for the current tool surface and any new capabilities.
-   Apollo MCP server -- exists per the broader sales-vendor MCP wave. WebFetch Apollo's MCP documentation for the current capability set.
-   Clearbit / Breeze Intelligence -- HubSpot-owned; integration surface continues to shift; verify current state at execution time.

### When to integrate

-   Inbound enrichment -- when a new lead lands in Airtable, call the enrichment provider's API or MCP to backfill company size, industry, funding stage, contact role, etc.
-   Account research at scale -- periodic refresh of enriched data on a portfolio of accounts; useful for ICP-fit scoring and territory planning.
-   Agent-driven workflows -- when the agent is doing the enrichment (researching an account before a meeting, prepping outreach), use the provider's MCP server from inside Airtable Automations or directly via the agent's connector.

### Look up at execution time

-   Each provider's current MCP capability surface (the most actionable surface as of 2026)
-   REST API current state and rate limits
-   Pricing-tier gating (ZoomInfo enterprise-only is real; Apollo more SMB-accessible)

## ABM platforms (6sense / Demandbase / Terminus)

Account-based marketing platforms. Rare in the Airtable footprint -- when they're in place, they typically handle the intent / signal layer above the CRM. Integration into Airtable is usually about pulling intent data per account for sales prioritization.

### Look up at execution time

-   Native Airtable sync? (Probably not; verify.)
-   Their REST APIs for intent / account signal export
-   Their webhooks for high-intent triggers
-   Their MCP servers

## Incentive compensation (CaptivateIQ / Spiff / Xactly / QuotaPath)

Commission tracking platforms. Effectively absent from the Airtable footprint -- most Airtable airtable-sales-ops customers track commission natively in Airtable (formulas + linked records on the Opportunities + Brokers / Agents tables). Recommend Airtable-native commission tracking rather than integrating with an external commission tool unless the user explicitly has one in place.

If the user does have one, integration is typically post-close (synced Closed-Won opportunities flow into the commission tool); no inbound flow back from the commission tool.

## CPQ (Salesforce CPQ / DealHub / PandaDoc)

Configure-Price-Quote tools. Also rare in the Airtable footprint -- most customers BUILD CPQ inside Airtable (pricing tables + tiered formulas + DocuSign send) rather than buy one. Recommend the build-in-Airtable approach unless the user is at multi-tier-pricing complexity that genuinely earns a CPQ tool's footprint (multi-year ramps, complex discount approvals, multi-product bundles with rate cards, regulatory compliance on quotes).

If the user does have one, integration is typically Opportunity -> CPQ for quote generation, with the signed quote PDF flowing back into Airtable as an attachment.

## Document signature (DocuSign / Dropbox Sign / Adobe Sign)

Common integration partner across airtable-sales-ops setups. Standard pattern: Airtable sends a contract to the signature tool via the tool's API (or via Airtable Automations webhooks); on signature, the tool's webhook triggers downstream Airtable work (Closed-Won status, ops handoff, billing trigger).

### Look up at execution time

-   Native Airtable sync for any of these? (Probably no -- these are write / event tools, not data syncs.)
-   DocuSign / Sign / Adobe Sign REST APIs for send-document flow
-   Their webhooks for on-signature events
-   Their MCP servers

## AI-native stack: Clay-equivalents, AI SDRs, conversation intel

A real and growing audience of AI-forward startups is deliberately building their GTM stack on AI-native tools rather than legacy CRM + add-ons. The skill should support this audience as a first-class persona -- not push them toward Salesforce. Often the right move is building the AI-native primitives natively in Airtable rather than integrating with a third-party tool.

### Clay (and Clay-equivalents: Apollo, Origami, FullEnrich, Databar.ai)

Two angles to surface: Airtable's native primitives can replicate Clay's core waterfall-enrichment pattern (Tables + typed columns + formulas + AI Field Agents + Automations calling external APIs) -- useful for teams who want to avoid Clay's add-on cost or who already have AI Field Agent access. Clay itself also has an official MCP server (verified -- see Clay's blog at `clay.com/blog/clay-mcp` and look up current capabilities) that exposes Clay's data layer to MCP-enabled clients. The MCP is read-focused at the time of writing -- searching contacts, pulling details, checking interaction history -- and the full 100+ provider waterfall enrichment still runs inside Clay's UI. Verify current MCP capabilities at execution time since this is evolving.

Clay also integrates directly with Gong (per Clay's product updates) -- call transcripts -> Clay enrichment -> CRM / Slack / etc.

Decision shape:

-   Want to avoid the add-on, have AI Field Agent access, modest provider needs -> build the waterfall natively in Airtable. See `references/sub-workflows.md#11-data-enrichment-waterfall-clay-equivalent`.
-   Already use Clay deeply, want Clay's data accessible to agents -> use Clay's MCP server.
-   Need the 100+ provider waterfall + credit-managed enrichment at scale -> keep Clay.

Look up at execution time:

-   Clay's REST API current state (auth, rate limits, pricing-tier gates)
-   Clay's webhook events for "enrichment complete"
-   Clay MCP's current capability surface (does it now trigger waterfalls? what objects? what actions?)
-   Apollo / Origami / FullEnrich / Databar.ai -- their MCP servers (Apollo has one per the broader wave; verify the others)

### AI SDR and AI sales engagement tools

A growing category of tools that use AI to draft, sequence, and (sometimes) send outbound. Two broad shapes worth distinguishing:

-   Autonomous AI SDR shape -- AI agents that prospect, draft, and send outbound largely without human review. The 2025-2026 market has shown this shape is harder than it looked; many teams that adopted autonomous-first tools have shifted to hybrid copilot patterns. Surface the validated alternative when relevant rather than building toward fully autonomous send in Airtable.
-   AI copilot shape -- AI drafts + human review + send through existing infrastructure (Outreach, Salesloft, Apollo, Regie.ai, etc., or directly via email gateways). This is the validated pattern. It composes cleanly with Airtable's AI Field Agents: Airtable drafts, the human reviews in an Interface, and the team's send tool handles deliverability and compliance.

Position for the skill:

-   When the user wants "an AI SDR" or "autonomous outbound": propose the copilot pattern. See `references/sub-workflows.md#12-ai-assisted-outbound-drafts-copilot-pattern-not-autonomous`. Airtable's AI Field Agents generate the drafts; the team's existing send infrastructure does the send; humans review in between.
-   When the user has an existing AI SDR or sales-engagement tool: don't comment on the choice. Help them shift to the copilot pattern in Airtable + their existing send tool if that's what they want, or layer Airtable above the existing tool for upstream lead management and downstream pipeline tracking.
-   AI content copilots (Regie.ai and similar layered on Outreach / Salesloft) integrate by pulling drafts into Airtable for additional context-layering and human review before pushing to the send tool.
-   AI sales engagement platforms (Amplemarket, Unify, Everlead, Nooks, etc.) -- newer category integrating signals + AI sequencing + content. These compete with dedicated send platforms more than with Airtable. Treat as engagement-platform integration partners if the user has one.

MCP coverage in this category: Outreach, Apollo, and Amplemarket all expose MCP servers as part of the broader sales-vendor MCP wave -- verify each vendor's current MCP capability surface and required plan tier at execution time. Agent-driven sequencing / signal-pull / engagement-data workflows are meaningfully more practical via MCP than via REST API setup.

Look up at execution time:

-   The user's specific tool's REST API and MCP server status
-   Outreach / Apollo / Amplemarket MCP capabilities -- the surfaces these expose (find leads, push sequences, pull engagement data, etc.)
-   Current state of the broader AI-SDR / AI-engagement category -- it's moving fast

### Conversation intelligence (Gong, Granola, Fathom, Krisp Notes, Fireflies, Avoma, Otter)

Growth area in the Airtable footprint -- and now substantially MCP-enabled. Gong, Granola, and other conversation-intel vendors have shipped MCP servers as part of the broader sales-vendor MCP wave, making transcript and signal ingestion via agent-driven workflows much more practical than it was at the customer-research baseline. Verify each vendor's current MCP capability surface and required plan tier at execution time.

Common integration shape:

-   Transcripts (or transcript summaries) sync into Airtable as records, linked to Opportunities and Accounts
-   AI Field Agents process transcripts to extract MEDDIC fields, risk signals, next steps, competitor mentions, sentiment
-   Extracted signals push back to Opportunity records (with human review for high-stakes updates)
-   At scale (10k-100k transcripts/year), use HyperDB instead of regular sync; AI processing is asynchronous

Tool-specific notes (verify current state -- this category is moving fast):

-   Gong -- established player. Official MCP server (typically credit-priced per query; integration must be registered in Gong). Deep webhook + REST API surface.
-   Granola -- AI-native meeting note tool, expanding from individual notetaker into enterprise app territory. Official MCP server with tools spanning natural-language Q&A across meeting history, listing meetings by time range, fetching meeting details, and pulling verbatim transcripts. Personal and enterprise API tiers exist; verify current tier scoping and pricing.
-   Fathom / Fireflies / Avoma / Otter -- Gong alternatives at lower price points. Some have MCP servers (Zapier-hosted or vendor-built); verify current state.
-   Krisp Notes -- newer entrant; AI noise-cancellation + meeting notes.

Salesloft + Clari merger context: Salesloft acquired Clari; platform unification is on a multi-year roadmap (verify current state). Initial integration was Clari forecasting embedded into Salesloft execution. The combined platform supports MCP. Treat the integration surface as actively evolving -- verify current capabilities, supported objects, and pricing at execution time before scaffolding workflows that depend on specific unified-platform features.

Look up at execution time:

-   Each tool's current MCP server capability surface -- these are evolving rapidly
-   Each tool's webhook + REST API state
-   Granola enterprise vs personal API tier requirements
-   Combined Salesloft / Clari platform's current MCP and integration surface

### Bardeen / browser AI agents

Bardeen is a Chrome-extension AI agent that automates browser-based sales workflows (LinkedIn scraping, CRM updates, lead research). At AI-forward startups it's commonly the "first AI hire" -- does prospecting research, fills in records, kicks off sequences.

Integration shape: Bardeen writes scraped / enriched data to Airtable via REST API (Bardeen has Airtable as a native action target). Use Airtable as the data layer; Bardeen as the browser-level prospecting agent that feeds it.

Look up at execution time:

-   Bardeen's current Airtable action surface
-   Bardeen MCP server
-   Bardeen pricing / plan-tier gating

### Origami / live-web-search lead providers

Newer category: live-web-search-backed prospecting tools (Origami pioneered the pitch -- "live web search beats static databases for recently-founded companies and newly-hired decision-makers"). Differentiator vs. ZoomInfo: real-time coverage of segments static databases miss.

Integration shape: similar to traditional enrichment providers -- feed Airtable records via REST API; complement (don't replace) Airtable's own AI Field Agent web research with a provider that handles deliverability validation.

Look up at execution time:

-   Origami / similar tools' REST APIs
-   Their pricing models (typically credit-based, with the same pricing-transparency tension as Clay)
-   Their MCP servers

### AI-native stack: when to recommend native Airtable vs. integrate

Default to native Airtable patterns for AI-native startups when:

-   The team is early-stage / lean
-   The team values data ownership and programmable control over the workflow
-   The team is small enough that the volumes don't need a specialized tool's scale
-   The team already has Airtable + LLM API access (Claude, OpenAI, Anthropic Field Agents via Airtable AI)

Default to integration with a specialized tool when:

-   The team has deep existing investment in the tool (sunk cost, team training)
-   Volume / scale outstrips what Airtable's native primitives handle (100+ provider waterfalls, 100k+ transcripts/year)
-   The specialized tool has deliverability / compliance infrastructure that's hard to replicate (sender warmup, multi-IP rotation, CAN-SPAM / CASL enforcement)
-   The user explicitly asks to integrate rather than replicate

When the choice isn't obvious, show the user both paths and let them pick. Don't push native-in-Airtable as a directive when the user has good reasons to keep a specialized tool.

## Data warehouses (Snowflake / Databricks / BigQuery)

For analytical workloads above the operational CRM data. Airtable's native sync supports Snowflake and Databricks; BigQuery via custom REST API or iPaaS.

### Common shape

-   Pipeline data, closed-won deals, activity logs flow OUT of Airtable into the warehouse for cross-source analytics
-   Aggregated insights (account-level health scores, segment-level conversion rates) flow BACK into Airtable via reverse-ETL (Hightouch / Census / Fivetran) for surfacing in operational Interfaces

### Look up at execution time

-   Current Airtable Snowflake / Databricks sync state, direction, scale
-   Current BigQuery integration options
-   Reverse-ETL tool current state (Hightouch / Census MCP servers, current rate limits)

## What this file is NOT

This file is not the place for:

-   Schema design (see `schema-shapes.md` and `vertical-shapes.md`)
-   Custom-app deployment patterns (see `build-shapes.md`)
-   Work-mode sub-workflow playbooks (see `sub-workflows.md`)

This file's job is integration / migration MECHANICS -- which tool integrates how with Airtable, what to look up at execution time for current details. Read it alongside `schema-shapes.md` for end-to-end build planning.
