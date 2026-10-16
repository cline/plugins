# Build shapes: pure Airtable vs. Airtable + custom app

Concrete patterns for the two output shapes from `SKILL.md` -- when each fits, and what the deliverable looks like. Load when the build-layer choice is non-obvious.

Before listing items in any `Configure in Airtable` or `Configure Portal` block in this file, inspect the registered Airtable MCP tools available through Cline for current support -- if the MCP now authors a surface you'd otherwise hand off (view, Interface page, Automation, Form, etc.), use the MCP path instead. The MCP's capability boundary is moving fast; what's a UI handoff today may be MCP-driven tomorrow.

## When pure Airtable is the right answer

Most _"set up product ops"_ invocations land here. The schema layer (via MCP) plus native Airtable UX (handed off as `[click here]` configuration steps) covers the workflow cleanly.

Signals the user wants pure Airtable:

-   _"I want to track X"_ / _"I want to manage Y"_ -- no UI specification.
-   _"Move from <single-purpose PM tool>"_ -- they want the same workflow with more flexibility, not a new UX.
-   _"Internal-facing"_, _"for my team"_, _"for our PMs"_ -- the audience is inside the org.
-   Time pressure / _"just build it"_ -- pure Airtable ships faster.

Stick with pure Airtable unless the user explicitly asks for a custom surface, a public-facing portal, or branded UX. Don't push the REST API tier for its own sake.

### Deliverable shape

```
✅ Built (via MCP):
  - [Base name] with [N] tables, [N] fields, linked records, [N] seed records
  - View in Airtable: [base link]

🎨 Configure in Airtable:
  - [Specific Kanban / calendar / gallery view, e.g. "Kanban on Roadmap grouped by Status"] -- [click here]
  - [Specific Interface page for the right stakeholder audience] -- [click here]
  - [Specific form / automation, e.g. "Form for feedback intake" or "Weekly status-rollover automation"] -- [click here]
```

Pick the 1-3 most-impactful handoffs for the workflow shape. Don't enumerate every possible view; the user can ask for more once they're in the base.

### Native Airtable UX surfaces

Inspect the registered Airtable MCP tools through Cline at execution time to determine the current tool surface -- don't freeze a list of "MCP authors X, doesn't author Y" in this file. When the MCP supports a surface, prefer the MCP path; for surfaces it doesn't yet author, hand off as `[click here]` UI configuration steps. The boundary is a capability one that closes over time, not a quality choice.

Surfaces that genuinely benefit from the UI even when MCP supports them (durable design choices, not capability gaps):

-   Granular permissions -- base / table / field / record / interface-level access controls. The UI's permission preview helps the user catch misconfigurations before they hit production.
-   OAuth sync setup wizards -- Jira / Salesforce / Zendesk / Google Drive / Databricks / etc. OAuth handshakes need human consent in a browser; agent-driven paths add friction without value.

For everything else (views, Interface Designer pages, Automations, Forms), enumerate the current MCP capability at execution time and hand off the rest to the UI. Common surfaces you'll likely hand off today (subject to change as the MCP evolves): Kanban / calendar / gallery / timeline / gantt / list views, Interface Designer pages (record review, dashboard, gallery, kanban, calendar, list, gantt), visual Automation chains, Forms with conditional logic.

## When Airtable Portals is the right answer (the middle path)

Portals is Airtable's first-party way to expose an Interface to external collaborators (customers, partners, vendors, contractors) through a custom-branded sign-in page. They don't need full Airtable accounts. Editor / Commenter / Read-only permissions; row-level filtering by current user. Paid add-on -- defer to `support.airtable.com` for current plan-tier availability and pricing rather than embedding those specifics here. One portal per base.

Signals the user wants Portals:

-   Branded external collaborator access without engineering bandwidth -- they want clients / partners / external stakeholders in a branded surface, but don't want to build and host a custom Vercel app.
-   The workflow fits Interface Designer's component set -- record review, dashboards, gallery, kanban, calendar, lists, forms. If the desired UX fits those components, Portals saves real build time.
-   Authenticated external audience -- Portals requires sign-in (email invite or shareable link). It's the right fit for customers / partners / vendors, not anonymous traffic.
-   Examples in airtable-product-ops: customer feedback intake portals where the brand matters but the workflow is form + status review; partner-facing read-only roadmap previews; M&A acquisition-onboarding portals where acquired-company teams submit standardized data post-close; external-customer roadmap voting / subscription portals (when the audience is named customers, not anonymous public).

Portals does NOT support:

-   Truly public unauthenticated audiences -- for SEO-indexed public roadmap pages or marketing-grade brand landing pages, go custom-app.
-   UX beyond Interface Designer's component set -- multi-step wizards, custom drag-and-drop, embedded chart libraries, animations. Go custom-app.

### Deliverable shape

```
✅ Built (via MCP):
  - [Base name] with [N] tables, [N] fields, linked records, [N] seed records
  - View in Airtable: [base link]

🌐 Configure Portal:
  - Enable Portal on the [Customer feedback intake / Partner roadmap / Onboarding] interface -- [click here]
  - Customize branded sign-in page (logo + background) -- [click here]
  - Invite first portal guest(s) -- [click here]

🎨 Configure in Airtable:
  - [Admin Interface page for internal triage] -- [click here]
  - [Automation tying portal events to internal workflow, e.g. "Notify product team when new feedback arrives via portal"] -- [click here]
```

### Surface both Portals and custom-app when relevant, and let the user choose

For external-facing surfaces, neither Portals nor a custom Vercel app is a universal default. Portals saves build time when its component set fits the workflow; a custom app gives full design control and avoids the add-on cost. The user knows their constraints (budget, design needs, engineering capacity, time-to-ship) better than the skill does. Suggest both and let them pick.

## When Airtable + custom app is the right answer

The user wants something Airtable's native surfaces can't quite deliver -- a branded UI, a public-facing portal, an embedded surface inside their existing product, or a chat-driven workflow. Airtable becomes the backend / database / automations layer; the agent builds whatever the user actually needs on top via the REST API.

Signals the user wants a custom app on top:

-   Public-facing surface needed -- portal, landing page, branded form, shareable surface for an unauthenticated audience. Interface Designer has sharing but the public surface area is limited; for truly public, branded, SEO-friendly, marketing-grade surfaces, custom UI is the right call.
-   More custom than Interfaces provide -- multi-step wizard, custom drag-and-drop, embedded chart libraries, complex conditional layouts, animations, bespoke design system. Interfaces will fight the user on these; a custom app wins.
-   Branded / explicit custom UI request -- _"I want it to look like our brand"_, _"on our domain"_, _"matching our marketing site."_
-   Embedded inside the user's existing product -- Airtable data surfaced via REST API inside a Next.js app, internal admin tool, customer-facing dashboard.
-   Chat-driven workflow -- Slack feedback intake bot, Teams release-notification bot, Discord community-feedback channel routing into Airtable.

When the build-layer choice isn't obvious, ask. _"Do you want this as a native Airtable workspace (faster, internal-facing, fully in Airtable's UI), or do you want a custom UI on top that uses Airtable as the backend (slower to ship, but branded / public-facing / more flexible)?"_

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

### Concrete custom-app patterns

Customer feedback portal on Vercel

-   Next.js app on a custom domain (e.g. `feedback.example.com`)
-   Public form for unauthenticated submitters; lightly-styled to match the user's brand
-   Writes to a Customer feedback table via REST API; PAT scoped to `data.records:write` on the feedback table only
-   Optional: spam protection (Cloudflare Turnstile, hCaptcha), rate limiting
-   Admin Interface page in Airtable for triage

Public roadmap viewer

-   Next.js app reading from a Roadmap table filtered to External visibility = Public
-   PAT scoped to `data.records:read` on the Roadmap table
-   Server-side rendering so the public roadmap is indexable / shareable / branded
-   Optional: voting form that writes to a separate Votes table; subscriber sign-up table for change notifications

Slack feedback intake bot

-   Slack app that listens for messages in designated channels, or processes emoji reactions on existing messages
-   On trigger: extracts message context (submitter, channel, original message), POSTs to Airtable Customer feedback table
-   PAT scoped to `data.records:write` + `schema.bases:read` for the target base
-   Hosted on Vercel serverless functions, Cloudflare Workers, or a long-running container -- depending on the user's existing infrastructure

Embedded admin dashboard inside an existing product

-   React components in the user's existing app that read from Airtable via REST API
-   Authenticates the end-user through the user's existing auth; uses a server-side proxy to make Airtable calls (don't ship PATs to the browser)
-   Real-time-ish updates via polling or webhook-driven cache invalidation

### REST API reference

Use [`airtable.com/developers/web/llms.txt`](https://airtable.com/developers/web/llms.txt) as the agent-readable index for the Airtable REST API -- 70+ endpoints, 30+ data models, guides. The REST API is strictly larger than the MCP and covers patterns the MCP doesn't: scoped PATs, OAuth flows for end-users, webhooks, sync sources, comments, scripts, fine-grained permissions.

### Patterns that need the custom-app layer specifically

These don't fit Interface Designer or Forms cleanly:

-   Multi-step wizards with branching logic that depends on previous answers (more than what conditional fields in Forms can express).
-   Custom drag-and-drop or freeform layout (Interfaces use a fixed grid).
-   Embedded interactive charts using a specific charting library (Recharts, Victory, D3) the user's design system uses.
-   Animations, transitions, or motion the user's brand calls for.
-   Multi-tenant access patterns where each end-user sees a different slice (Interface Designer supports row-level permissions but the configuration is brittle at scale).
-   Server-side computation before display (e.g. running an LLM call to summarize records before rendering them).

When the user describes one of these explicitly, go straight to custom-app. When the user describes their need at a workflow level (_"customers should be able to vote on features"_), there's usually a path through both Interfaces (faster, more constrained) and custom-app (slower, more flexible) -- ask which they want.

## Hybrid shapes

It's normal to combine both layers in one deliverable -- e.g. a public-facing portal for external submitters (custom app) plus an internal triage interface for the PM team (Airtable Interface page). The output shape lists both:

```
✅ Built (via MCP):
  - [Base + schema]
  - View in Airtable: [base link]

🛠️ Custom app (public-facing):
  - [Customer portal at vercel-url]
  - PAT scoped to data.records:write on the Customer feedback table

🎨 Configure in Airtable (internal):
  - Triage Interface page for PMs -- [click here]
  - Automation: notify Slack when High-priority feedback arrives -- [click here]
```

Don't force the user into one layer or the other if both serve different audiences.
