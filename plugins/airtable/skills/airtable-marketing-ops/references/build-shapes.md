# Build shapes: pure Airtable vs. Airtable + custom app

Concrete patterns for the two output shapes from `SKILL.md` -- when each fits, and what the deliverable looks like. Load when the build-layer choice is non-obvious.

Before listing items in any `Configure in Airtable` or `Configure Portal` block in this file, inspect the registered Airtable MCP tools available through Cline for current support -- if the MCP now authors a surface you'd otherwise hand off (view, Interface page, Automation, Form, etc.), use the MCP path instead. The MCP's capability boundary is moving fast; what's a UI handoff today may be MCP-driven tomorrow. Marketing-ops has more public-facing surfaces than airtable-product-ops, so the custom-app path comes up more often here.

AI-forward defaults across patterns. The installer audience for this plugin is AI-forward by selection -- surface AI-native variants of these build shapes as defaults rather than aspirational notes. For pure Airtable, the AI angle is AI fields on tables (categorization, expansion, summarization -- see `references/schema-shapes.md`). For Portals, AI fields can power external review (e.g. AI pre-flags on Asset Review attachments before the human reviewer opens the asset). For custom apps, AI-drafted content with human review is the dominant pattern -- see the self-serve collateral generator and the Slack-bot patterns below for concrete shapes.

## When pure Airtable is the right answer

Most _"set up marketing ops"_ invocations land here. The schema layer (via MCP) plus native Airtable UX (handed off as `[click here]` configuration steps) covers the workflow cleanly.

Signals the user wants pure Airtable:

-   _"I want to track X"_ / _"I want to manage Y"_ -- no UI specification.
-   _"Move from [Workfront / Asana / Wrike / Monday / Smartsheet / ClickUp / Trello / Notion]"_ -- they're consolidating work-management onto Airtable's relational layer. Follow their lead on full migration vs. hybrid (planning layer in front of existing tool); see `references/migrations.md` for per-tool migration guidance and the hybrid section above for that shape.
-   _"Internal-facing,"_ _"for my team,"_ _"for our marketing org"_ -- the audience is inside the org.
-   Time pressure / _"just build it"_ -- pure Airtable ships faster.

Stick with pure Airtable unless the user explicitly asks for a custom surface, a public-facing portal, or branded UX. Don't push the REST API tier for its own sake.

### Hybrid: Airtable as planning layer in front of an existing tool

A common shape for teams that want consolidation benefits without retiring their existing work-management tool: Airtable handles intake, planning, triage, and stakeholder visibility, and pushes approved work into the existing tool (Workfront / Asana / Monday / Wrike / Smartsheet / ClickUp / Jira) via sync. The legacy tool keeps doing execution; Airtable becomes the relational layer above it where the campaign brief, the asset pipeline, the budget, and the performance data link together.

When this fits well: large enterprises where IT or change-management velocity makes full retirement of the existing tool slow; teams that genuinely value features of the existing tool (e.g., Workfront's resource-leveling) and want to keep using it for those while moving the airtable-marketing-ops surface to Airtable; teams that want to start consolidating immediately and migrate fully later.

When full migration fits better: the existing tool is one of the long-tail PM tools customers commonly retire (Smartsheet, ClickUp, Trello, Notion, Basecamp); the team isn't deeply tied to the existing tool's features; the user explicitly wants to consolidate licenses.

Follow the user's preference. If they ask for a hybrid, build a hybrid. If they ask for a full migration, follow the per-tool guidance in `references/migrations.md`. If they're undecided, surface the trade-offs and let them choose.

### Deliverable shape (pure Airtable native)

```
✅ Built (via MCP):
  - [Base name] with [N] tables, [N] fields, linked records, [N] seed records
  - View in Airtable: [base link]

🎨 Configure in Airtable:
  - [Specific calendar / kanban / gallery view, e.g. "Calendar view on Campaigns keyed by Launch date"] -- [click here]
  - [Specific Interface page for the right stakeholder audience] -- [click here]
  - [Specific form / automation, e.g. "Form for marketing request intake" or "Slack notification on Status = Approved"] -- [click here]
```

Pick the 1-3 most-impactful handoffs for the workflow shape. Don't enumerate every possible view; the user can ask for more once they're in the base.

### Native Airtable UX surfaces

Inspect the registered Airtable MCP tools through Cline at execution time to determine the current tool surface -- don't freeze a list of "MCP authors X, doesn't author Y" in this file. When the MCP supports a surface, prefer the MCP path; for surfaces it doesn't yet author, hand off as `[click here]` UI configuration steps. The boundary is a capability one that closes over time, not a quality choice.

Surfaces that genuinely benefit from the UI even when MCP supports them (durable design choices, not capability gaps):

-   Granular permissions -- base / table / field / record / interface-level access controls. The UI's permission preview helps the user catch misconfigurations.
-   OAuth sync setup wizards -- Salesforce / HubSpot / Marketo / Workfront / Jira / Google Drive / Snowflake / Databricks / etc. OAuth handshakes need human consent in a browser; agent-driven paths add friction without value.

For everything else (views, Interface Designer pages, Automations, Forms, Asset Review / Proofing configuration), enumerate the current MCP capability at execution time and hand off the rest to the UI. Common surfaces you'll likely hand off today (subject to change as the MCP evolves): Kanban / calendar / gallery / timeline / gantt / list views, Interface Designer pages (record review, dashboard, gallery, kanban, calendar, list), visual Automation chains, Forms with conditional logic and branding, Asset Review and Proofing setup.

## When Airtable Portals is the right answer (the middle path)

Airtable Portals is the no-code middle path between pure-internal-Airtable and a custom Vercel app. It publishes an Interface to external collaborators (clients, vendors, partners, contractors) through a custom-branded sign-in page. External users sign in with email -- no full Airtable account required, no custom hosting, no PAT-scoping work. For most airtable-marketing-ops external-collaborator use cases, Portals is the right default.

Signals the user wants Portals:

-   External logged-in audience -- clients, vendors, partners, contractors, agencies -- each sees only their own records via row-level filtering by current-user.
-   Branded sign-in experience needed -- Business+ / Enterprise plans support logo + background image on the sign-in page.
-   No custom domain required -- Portal users access via Airtable-hosted URLs; if your customer needs the surface at `clients.<agency>.com`, that's custom-app territory.
-   Agency client portal pattern -- each client signs in, sees their own briefs / approval queue / retainer hours. Comment-only portal users can fully participate in Proofing workflows for agency review loops.
-   Vendor or partner co-marketing portal -- brand approves co-op assets per partner; partners see only their own activations.
-   Brand asset library for external partners -- read-only portal access for asset download with usage-rights metadata; (read-only portal users aren't billable, so this scales cheaply).

Plan / pricing: Available on Team / Business / Enterprise plans; branded sign-in on Business+. Read-only portal users aren't billable. One portal per base. For current seat pricing, seat-pack ladders, SSO support for portal users, and other tier-specific feature gates, see `airtable.com/pricing` at execution time -- these evolve. Default workaround for SSO is email-invite or shareable link.

What Portals can NOT do (push to custom-app for these):

-   Truly public / unauthenticated audiences -- portal users have to sign in.
-   SEO-indexed surfaces -- no public crawl path; the portal isn't search-engine-discoverable.
-   Custom UI beyond Interface Designer's component set -- multi-step wizards, embedded chart libraries, animations, bespoke layouts.
-   Custom domain -- portal URLs live on Airtable's host.
-   Embedded inside the user's existing product -- for that, REST API + custom UI.

### Deliverable shape (Portals)

```
✅ Built (via MCP):
  - [Base name] with [N] tables, [N] fields, linked records, [N] seed records
  - View in Airtable: [base link]

🌐 Configure Portal:
  - Enable Portal on the [Client Review] interface -- [click here]
  - Customize branded sign-in page (logo + background) -- [click here]
  - Invite first portal guest(s) -- [click here]

🎨 Configure in Airtable (internal admin):
  - [Triage interface for internal team] -- [click here]
  - [Automation: notify Slack when external collaborator submits] -- [click here]
```

## When Airtable + custom app is the right answer

The user wants something Portals and Interface Designer can't quite deliver -- an unauthenticated public surface, SEO-indexed brand pages, custom UI beyond Interface Designer's component set, branded UX on their own domain, embedded surfaces inside their existing product, or a chat-driven workflow. Airtable becomes the backend / database / automations layer; the agent builds whatever the user actually needs on top via the REST API.

Marketing-ops has more public-facing surfaces than airtable-product-ops. Common custom-app patterns: public-facing campaign landing pages, brand-asset libraries with SEO, self-serve collateral generators, chat-driven request bots. For external-collaborator-with-login use cases (agency client portals, partner co-marketing), default to Portals first -- only reach for custom-app when Portals' constraints don't fit.

Signals the user wants a custom app on top:

-   Truly public-facing surface needed -- public landing page, SEO-indexed brand page, asset library for an unauthenticated audience, public campaign-timeline surface. Portals requires sign-in; for anonymous / discoverable surfaces, go custom-app.
-   Self-serve collateral generation for a large field force -- loan officers, real-estate agents, sales reps generating personalized flyers / one-pagers / pitch decks via Airtable + Bannerbear + Make pattern (see below).
-   Custom domain required -- _"I want it on `clients.<our-domain>.com`."_ Portals live on Airtable's host.
-   More custom than Interfaces provide -- multi-step wizard, custom drag-and-drop, embedded chart libraries (Recharts / Victory / D3), complex conditional layouts, animations, bespoke design system.
-   Branded UX matching marketing site -- _"I want it to look like our brand,"_ _"matching our marketing site."_
-   Embedded inside the user's existing product -- Airtable data surfaced via REST API inside a Next.js app, internal admin tool, customer-facing dashboard.
-   Chat-driven workflow -- Slack feedback intake bot, Teams brand-asset request bot.

When the build-layer choice isn't obvious, ask. _"Do you want this as native Airtable (fastest, internal-facing), Airtable Portals (no-code, branded sign-in for external collaborators), or a custom UI on top via REST API (slower to ship, but truly public / custom-domain / custom UI)?"_

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
  - [Admin interface page for triage] -- [click here]
  - [Automation tying app to base events] -- [click here]
```

### Concrete custom-app patterns for airtable-marketing-ops

Agency client portal on Vercel (only when Portals doesn't fit)

For most agency client portals, use Airtable Portals (described above) -- it's no-code, branded sign-in, fast, and Proofing's comment-only portal users handle review loops cleanly. Only go custom-app for the agency client portal when: the agency needs a custom domain (e.g. `clients.<agency-name>.com`), per-client subdomains, UI beyond Interface Designer's component set, or branded UX matching the agency's marketing site.

If those constraints apply:

-   Next.js app on the custom domain with per-client login or per-client subdomain.
-   Each client sees only their own briefs, in-progress work, approval queue, and retainer hours used.
-   Writes brief submissions to the agency's Airtable Briefs table via REST API with `Client` automatically set.
-   PAT scoped to `data.records:write` on the specific Briefs / Campaigns / Approvals tables.
-   Brand-customizable per client (logo, colors, copy).
-   Admin Interface page in Airtable for the agency team to triage incoming briefs.

Self-serve collateral generator (Airtable + Bannerbear + Make / Vercel)

-   Field reps (loan officers, real-estate agents, sales reps, store managers) log into a branded Interface page or Vercel app.
-   They select a campaign / product / property -> pick a template -> enter local data (name, contact, region) -> click Generate.
-   Behind the scenes: Make.com (or Vercel function) reads the input from Airtable, calls Bannerbear API to render branded image / PDF, writes the result URL back to Airtable, surfaces it to the user.
-   PAT scoped to `data.records:read+write` on Templates + Generated Output tables.
-   Common in mortgage, real estate, insurance, B2B sales -- industries with a small marketing team supporting a large field force.
-   AI-forward default (copilot pattern): pair the template-render pipeline with AI-drafted copy variations. AI fields on a Template Variation table draft headline / body copy variants per audience segment + region; the field rep reviews and selects (or edits) the variant before Bannerbear renders it. Brand and compliance constraints are encoded as guardrails on the AI field (approved-claim allowlist, locale-specific disclaimer routing). Strongly fits the AI-forward installer audience -- pure template-only generation feels dated compared to AI-drafted variants under brand guardrails.

Branded public brand-asset library

For partner / vendor logged-in audiences, use Airtable Portals with read-only seats (which aren't billable) -- much simpler than a custom app. Go custom-app only when the brand-asset library needs to be truly public (no login required), SEO-indexed, or matched to the customer's marketing-site brand on their own domain.

If those constraints apply:

-   Next.js app reading from a Brand Assets table filtered to `Public visibility = True`.
-   Server-side rendering for SEO; partner / agency download access with usage-rights metadata.
-   PAT scoped to `data.records:read` only on the public Assets table.
-   Includes brand-guideline page rendered from a Guidelines table.
-   Optional: download tracking writes back to a Downloads table.

Public-facing campaign landing page

-   Marketing landing page on the user's domain reading campaign data from Airtable (countdown, prizes, CTA copy).
-   PAT scoped to read-only on a Public Campaigns table; the marketing team updates Airtable, the page auto-refreshes (poll or webhook-driven cache invalidation).
-   Hosted on Vercel / Cloudflare Pages for performance; CDN-cached.
-   Optional: lead capture writes back to a Leads table.

Slack-emoji-reaction -> Airtable marketing request bot

-   Slack app that listens for messages in designated channels or processes emoji reactions on existing messages.
-   On trigger: extracts message context (submitter, channel, original message), POSTs to Airtable Marketing Requests table.
-   PAT scoped to `data.records:write` + `schema.bases:read` for the target base.
-   Hosted on Vercel serverless functions, Cloudflare Workers, or long-running container.
-   Useful for GTM / sales feedback intake where the team lives in Slack and won't leave it to fill out a form.
-   AI-forward default (copilot pattern): as the bot posts each captured request to Airtable, an AI categorization field auto-tags request type / urgency / suggested owner. The triage queue sorts on these AI signals; the human triager confirms each batch before requests promote to the working queue. Removes the "every Slack ping is unstructured" tax without removing human judgment.

Embedded admin dashboard inside an existing product

-   React components in the user's existing CMS, internal admin tool, or marketing platform that read from Airtable via REST API.
-   Authenticates the end-user through the user's existing auth; uses a server-side proxy to make Airtable calls (don't ship PATs to the browser).
-   Real-time-ish updates via polling or webhook-driven cache invalidation.

### REST API reference

Use [`airtable.com/developers/web/llms.txt`](https://airtable.com/developers/web/llms.txt) as the agent-readable index for the Airtable REST API -- 70+ endpoints, 30+ data models, guides. The REST API is strictly larger than the MCP and covers patterns the MCP doesn't: scoped PATs, OAuth flows for end-users (critical for per-client agency portals), webhooks, sync sources, comments, scripts, fine-grained permissions, attachment uploads (for the collateral generator and asset library patterns), SCIM provisioning.

### Patterns that need the custom-app layer specifically

These don't fit Interface Designer or Forms cleanly:

-   Multi-step wizards with branching logic that depends on previous answers (more than what conditional fields in Forms can express).
-   Custom drag-and-drop or freeform layout (Interfaces use a fixed grid).
-   Embedded interactive charts using a specific charting library (Recharts, Victory, D3) the user's design system uses.
-   Animations, transitions, or motion the user's brand calls for.
-   Multi-tenant access patterns where each end-user sees a different slice -- Interface Designer supports row-level permissions but the configuration is brittle at scale (especially across hundreds of agency clients).
-   Server-side computation before display (e.g. running an LLM call to summarize records, calling Bannerbear to render an image, hitting a translation API).
-   On-brand customizable per-client UX in agency settings.

When the user describes one of these explicitly, go straight to custom-app. When the user describes their need at a workflow level (_"clients should be able to submit briefs"_), there's usually a path through both Interfaces (faster, more constrained) and custom-app (slower, more flexible) -- ask which they want.

## Hybrid shapes

It's normal to combine both layers in one deliverable -- e.g. a public-facing brand portal for external partners (custom app) plus an internal triage interface for the in-house marketing team (Airtable Interface page). The output shape lists both:

```
✅ Built (via MCP):
  - [Base + schema]
  - View in Airtable: [base link]

🛠️ Custom app (public-facing):
  - [Brand portal at vercel-url]
  - PAT scoped to data.records:read on the public Assets table

🎨 Configure in Airtable (internal):
  - Triage Interface page for the marketing team -- [click here]
  - Automation: notify Slack when Partner submits a new asset request -- [click here]
```

Don't force the user into one layer or the other if both serve different audiences. Most "agency client portal" and "brand asset library" deployments are hybrids by nature.
