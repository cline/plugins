# Migration guidance: from work-management tools to Airtable

Per-tool guidance for migrating airtable-marketing-ops workflows off legacy work-management tools onto Airtable. Load the section that matches what the user is moving from.

## Why customers consolidate onto Airtable

The pain points that drive these migrations are remarkably consistent across customer research: _"swivel-chair work"_ across multiple tools, _"too many sources of truth,"_ _"fragmented Excel/Word/SharePoint calendars,"_ _"fragmented PowerPoints with overlaps and double-spend,"_ _"email-driven request 'ambushes,'"_ _"lost ideas with no central repository."_ Each tool the team uses solves part of the problem and creates another. Airtable's value-prop is being the single relational layer where marketing taxonomies (region × brand × channel × persona × funnel-stage × motion) actually fit, where the calendar, the briefs, the assets, the budget, and the performance data all link to one another instead of living in parallel silos.

When a user mentions they're using Workfront / Asana / Monday / Wrike / Smartsheet / ClickUp etc., the agent should help them consolidate -- most often via full migration (covered below), sometimes via a hybrid "planning layer in front of existing tool" pattern (see `references/build-shapes.md`) when that's what the user actually wants. Follow the user's lead. If they ask for a wrapper / hybrid, build a wrapper / hybrid. If they ask for a full migration, do the migration. If they're undecided, surface the trade-offs (full migration consolidates licenses + escapes lock-in + flattens the data layer; hybrid is faster to ship and lower change-management overhead) and let them choose.

AI-fields upgrade angle. Most of the source tools below (Workfront, Asana, Monday, Wrike, Smartsheet, ClickUp, Trello, Notion, Basecamp, MS Planner, MS Project) don't have native per-record AI capabilities at parity with Airtable's AI fields -- at best they offer bolt-on AI add-ons or AI sidebars. Migrating to Airtable adds AI fields as a native capability across every table: AI categorization on Requests, expansion on Briefs, narrative summaries on Performance / Budget / Approvals, translation on locale-variants, pre-flag on compliance reviews (see `references/sub-workflows.md` for the per-sub-workflow AI-native variants). Worth surfacing as part of the consolidation value-prop for AI-forward teams -- those teams are this plugin's installer audience by selection.

## How this file is structured

Each tool's section gives durable conceptual guidance -- the data-model mapping, what's preserved, what reshapes, common stumbling blocks. This content is shape-of-the-tool, not API-of-the-tool, so it stays accurate as the vendors change their export tooling.

For current migration mechanics (which API endpoints exist today, which pricing tiers gate exports, what the current UI calls things), the agent should look up live documentation at execution time across these four categories:

1. Airtable native sync integration -- does Airtable have a sync source for this tool? Native sync is the lowest-friction path if it exists. Look up: `airtable.com/integrations`, the Airtable Sync setup page in the user's base, or the vendor's Airtable-integration documentation.
2. Source-tool REST API -- used for one-time scripted migration when no native sync exists, or for richer relationships native sync doesn't preserve. Look up: the source tool's developer documentation (typically `developer.<vendor>.com` or `<vendor>.com/developers`); check authentication mechanism (OAuth / PAT / API key), rate limits, pricing-tier gates on API access, and the specific endpoints for the entities being migrated.
3. Source-tool webhooks / triggers -- useful for parallel-run periods (mirror new records into Airtable as they're created in the source) and for one-time backfills via change-events. Look up: vendor's webhook documentation; typically subscribed at the workspace / project level.
4. Source-tool MCP server -- if one exists, the agent can drive the migration via MCP rather than writing custom scripts. Look up: vendor's MCP documentation, `mcp-servers.org` or equivalent registry, and the vendor's GitHub for community MCP servers.

Specific search prompt template for the agent (parameterize the tool name):

> _"Find current documentation for migrating from `<TOOL>` to Airtable: (a) does Airtable have a native sync integration for `<TOOL>`? (b) does `<TOOL>` expose a REST API for bulk export, what auth does it use, what pricing tier is required, what are the rate limits? (c) does `<TOOL>` support webhooks for change events? (d) is there a `<TOOL>` MCP server (official or community)?"_

The agent then picks the lowest-friction option that fits the user's scale and access level.

## Generic migration pattern

Applies to all tools below. Phases stay the same regardless of which mechanic (sync / API / webhooks / MCP) the agent ends up using:

1. Inventory -- list every project / board / sheet / list in the source tool. Surface "dead" ones the user can drop during migration.
2. Map the taxonomy -- what's a Project vs. Task vs. Subtask in the source tool? How does that map to Airtable tables and linked records? Document before exporting. Don't try to mirror the source's schema verbatim -- the source's quirks usually shouldn't survive the move.
3. Pick a mechanic -- see the four-category lookup above. Default order of preference when multiple exist: Airtable native sync > source-tool MCP > source-tool REST API > webhooks > CSV export.
4. Build the Airtable schema via MCP -- pick the lead schema shape from `references/schema-shapes.md` based on team size and sub-workflow.
5. Transform + import -- Airtable's CSV import handles many cases; for cross-record relationships use the REST API to populate linked-record fields after initial import.
6. Rebuild views and automations -- source-tool dashboards become Interface pages; source-tool automations become Airtable Automations; source-tool reports become filtered views.
7. Run in parallel before sunset -- let the team validate the migration with real workflows. Plan an explicit cutover date with the user.
8. Decommission -- close the old tool's licenses, archive the export data, document what was preserved vs. what reshaped.

## Workfront

Common migration source at Enterprise airtable-marketing-ops setups.

Source pattern: Projects -> Tasks -> Subtasks. Templates. Workflows. Requests. Documents / Proofing. Resource management. Reports / dashboards. (Adobe acquired Workfront; the surface has been Adobe-ified over recent years -- check current docs.)

What's preserved across most migration mechanics: project / task hierarchy, dates, assignments, status, custom fields, attachments, comments.

What reshapes:

-   Workfront templates -> Airtable record templates with automation triggers. Manually rebuild -- templates rarely export cleanly across any mechanic.
-   Workfront Proofing workflow -> Airtable's native Proofing is the direct replacement: upload assets to an attachment field configured as "Versions," reviewers annotate directly on the asset, versions render side-by-side, comment-only users can fully participate (good for external agency / stakeholder review loops). Asset Review covers pixel-perfect annotation on image and video attachments separately. For current plan-tier gates, supported formats, file-size limits, and the specific annotation toolset, see `support.airtable.com` at execution time -- those evolve. External proofing tools (PageProof / Frame.io / Ziflow) remain a fit for specialized cases Airtable doesn't cover (broadcast video proofing with broadcast-spec annotations, very strict regulatory version-control workflows), but aren't the default. Note: Workfront's proofing annotations don't typically export cleanly -- plan to re-upload assets and run new reviews in Airtable going forward, archiving the Workfront annotation history separately if compliance requires.
-   Workfront Resource management -> Airtable Capacity per team-quarter table with rollups from Tasks (see `references/schema-shapes.md` "Capacity / resource planning").
-   Workfront Reports / dashboards -> Airtable Interface Designer pages. Most map cleanly; complex pivot reports may need formula fields.

Stumbling blocks:

-   Workfront's "iteration" / "agile" features are deep. Most marketing teams use them lightly, but PMO / IT users dig in. Audit which features are actually load-bearing before migration.
-   Permissions are more granular in Workfront than in Airtable (per-field, per-section permission models). Plan permission model up front; sometimes the answer is multiple bases with sync rather than one base with elaborate per-field permissions.
-   Large attachment volumes -- Airtable has per-base attachment-storage limits. For million-asset DAMs, integrate with an external store (Box / Dropbox / S3) and link from Airtable.

Schema mapping: Workfront Project -> Airtable Campaign or Project record; Workfront Task -> Airtable Task / Deliverable; Workfront Status -> singleSelect; Workfront Custom Field -> typed Airtable field.

Look up at execution time:

-   Native Airtable sync for Workfront? Check the Airtable Integrations page.
-   Workfront REST API specifics (Adobe's current API surface, auth model, rate limits, what's gated to which Workfront plan).
-   Workfront webhooks for parallel-run change capture.
-   Adobe / Workfront MCP server (community or official).

## Asana

Common at mid-market.

Source pattern: Teams -> Projects -> Tasks -> Subtasks. Custom Fields. Sections. Dependencies. Portfolios. Goals (OKRs).

What's preserved across most migration mechanics: task hierarchy (with reshape), custom fields, assignments, due dates, status, comments.

What reshapes:

-   Asana Sections -> Airtable view grouping by Status or a Section singleSelect field. Don't make Section its own table -- usually overkill.
-   Asana Goals / OKRs -> separate Airtable OKRs table linked to Projects / Campaigns.
-   Asana Portfolios -> either Airtable views with grouping or cross-base sync if portfolio data lives across teams.
-   Asana Subtasks-of-subtasks (3+ levels deep) -> consolidate to 2 levels via linked records; deep nesting rarely survives the move cleanly.
-   Asana Rules (automations) -> Airtable Automations; usually a 1:1 translation.

Stumbling blocks:

-   Free-form text fields where structure should live -- migration is an opportunity to enforce structure. Convert ad-hoc text into typed fields, multipleSelects, or linked records.
-   Asana customers often have inconsistent taxonomy across projects ("Status" means different things in different projects). Standardize during migration.

Schema mapping: Asana Project -> Airtable Campaign / Project; Asana Section -> status singleSelect (or view grouping); Asana Custom Field -> typed Airtable field; Asana Subtask -> linked record to a child table.

Look up at execution time:

-   Native Airtable sync for Asana?
-   Asana API specifics (auth, rate limits, pricing-tier gates).
-   Asana webhooks.
-   Asana MCP server.

## Monday.com

Common at mid-market -- the closest philosophical competitor to Airtable's relational layer.

Source pattern: Workspaces -> Boards -> Groups -> Items -> Subitems. Columns (typed similarly to Airtable fields). Dashboards. Automations. Workdocs.

What's preserved across most migration mechanics: items, column values (most types map directly), groups, dependencies, assignments, automations (with reshape).

What reshapes:

-   Monday Item-board-group taxonomy doesn't map 1:1 to Airtable. Usually: Board -> Table; Group -> status singleSelect; Item -> Record. Subitems -> linked records to a child table.
-   Monday Automations -> Airtable Automations. Most one-trigger-one-action rules translate cleanly.
-   Monday Dashboards -> Airtable Interface Designer pages.
-   Monday Workdocs -> not directly Airtable. Use attachment fields with linked Google Docs / Notion / Confluence, OR migrate doc content to a multilineText field.
-   Monday Mirror columns -> Airtable lookup fields.
-   Monday Connect boards column -> Airtable linked records.

Stumbling blocks:

-   Boards-with-mixed-purpose (one Monday board has multiple types of work crammed together). Migration is the opportunity to split into clean tables.
-   Monday customers often have many boards; consolidate during migration. Don't end up with 30+ Airtable tables that should be 5-8 with linked records.

Schema mapping: Board -> Table; Group -> singleSelect; Column -> typed field; Mirror column -> lookup; Connect boards -> linked record.

Look up at execution time:

-   Native Airtable sync for Monday?
-   Monday API specifics.
-   Monday webhooks.
-   Monday MCP server (Monday has been investing in agent-facing surfaces -- check current state).

## Wrike

Mid-market to enterprise. Heavier customization than Asana / Monday.

Source pattern: Folders -> Projects -> Tasks -> Subtasks. Custom workflows (per-folder). Request forms. Reports. Approvals. Resource management.

What's preserved across most migration mechanics: hierarchy, custom workflows (with reshape), assignments, dates, dependencies.

What reshapes:

-   Wrike Folders are organizational, not data-bearing -- usually become Airtable view filters or a "Program" singleSelect field on Projects.
-   Wrike Custom workflows are deep (often many statuses per workflow with custom transition rules). Translating to Airtable singleSelect colors may lose nuance -- pick the load-bearing transitions and consolidate the rest.
-   Wrike Approvals -> Airtable Approvals table with stage + approver + decision audit trail.
-   Wrike Request forms -> Airtable Forms (with conditional logic if needed).
-   Wrike Reports -> Airtable Interface pages.
-   Wrike complex permission model is more granular than Airtable's; usually simplifies during migration.

Stumbling blocks:

-   Custom workflows often have years of process embedded. Don't try to migrate them verbatim; treat migration as an opportunity to simplify.
-   Wrike's "task linking" (predecessor / successor) maps to a self-linking `Predecessors` field on the Tasks table (Airtable's official Gantt dependency pattern -- one linked-record field linking Tasks to Tasks, not a separate Dependencies table). Airtable Gantt currently supports FS dependencies only -- SS / FF / SF links in Wrike collapse to FS or get flagged as "manual coordination needed." See `support.airtable.com/docs/gantt-view-milestones-dependencies-and-critical-paths` for current behavior.

Schema mapping: Wrike Project -> Airtable Project / Campaign; Wrike Task -> Airtable Task; Wrike Custom Field -> typed Airtable field; Wrike Workflow -> singleSelect status with color-coded choices.

Look up at execution time:

-   Native Airtable sync for Wrike?
-   Wrike API specifics.
-   Wrike webhooks.
-   Wrike MCP server.

## Smartsheet

Common at mid-market -- Excel-like.

Source pattern: Sheets (Excel-like) with rows + columns. Cross-sheet cell references. Reports. Dashboards. Automations.

What's preserved across most migration mechanics: rows as records, columns as fields, basic formulas (rewrite to Airtable formula syntax), dates, attachments.

What reshapes:

-   Smartsheet Formulas -> rewrite using Airtable formula syntax. Common translations: `IF/AND/OR` are direct; `INDEX/MATCH` becomes lookup field; `SUMIFS` becomes rollup field with conditional formula; `WORKDAY` is similar.
-   Smartsheet Cell linking (cross-sheet references) -> Airtable linked records or lookup fields. The biggest win of the migration: cell links are fragile in Smartsheet; linked records are first-class in Airtable.
-   Smartsheet Card view -> Airtable Kanban view.
-   Smartsheet Dashboards -> Airtable Interface pages.
-   Smartsheet Reports -> Airtable views with filters.
-   Smartsheet Workflows / Automations -> Airtable Automations.

Stumbling blocks:

-   Smartsheet customers often have many sheets they treat as one logical system (linked via cell references). Don't migrate each sheet to its own Airtable table -- consolidate to fewer tables with linked-record relationships. The migration's biggest value is escaping cell-link fragility.
-   Formula rewrites are the biggest time cost. Budget time for this.
-   Smartsheet's "parent / child row hierarchy" within a sheet -> split into parent table and child table linked, OR collapse to a singleSelect category field.

Schema mapping: Sheet -> Table (often consolidated); Column -> field; Cell link -> linked record / lookup; Parent / child rows -> linked records to a child table.

Look up at execution time:

-   Native Airtable sync for Smartsheet?
-   Smartsheet API specifics.
-   Smartsheet webhooks.
-   Smartsheet MCP server.

## ClickUp

Mid-market -- flexible.

Source pattern: Spaces -> Folders -> Lists -> Tasks -> Subtasks. Custom fields. Goals. Dashboards. Docs. Whiteboards.

What's preserved across most migration mechanics: hierarchy, custom fields (most types map), assignments, due dates, status, tags, comments.

What reshapes:

-   ClickUp per-list statuses (statuses can differ per list) -> Airtable singleSelect is per-table. Consolidate to a shared status taxonomy during migration.
-   ClickUp Whiteboards -> not directly Airtable. Use Miro / FigJam externally with linked attachments.
-   ClickUp Docs -> use Airtable attachment + external doc link, OR migrate content to multilineText fields.
-   ClickUp Goals -> separate Airtable OKRs table.
-   ClickUp Dashboards -> Airtable Interface pages.
-   ClickUp Automations -> Airtable Automations.

Stumbling blocks:

-   ClickUp's flexibility is also its weakness -- customers often have inconsistent taxonomy across lists. Migration is an opportunity to standardize.
-   "Statuses-per-list" inconsistency: the migrating team needs to agree on a unified status taxonomy before importing.
-   ClickUp's "everything" framing means customers often have many lists of marginal value. Inventory first; sunset half.

Schema mapping: ClickUp List -> Airtable Table; Custom Field -> typed field; Goal -> separate OKRs table; Subtask -> linked record.

Look up at execution time:

-   Native Airtable sync for ClickUp?
-   ClickUp API specifics.
-   ClickUp webhooks.
-   ClickUp MCP server.

## Trello

Smaller / simpler -- usually a lightweight migration.

Source pattern: Boards -> Lists -> Cards. Labels. Custom Fields (paid tiers). Power-Ups. Checklists.

What's preserved across most migration mechanics: cards, lists, labels, due dates, assignments, comments, checklist items (with reshape).

What reshapes:

-   Trello Lists -> status singleSelect.
-   Trello Labels -> multipleSelects field.
-   Trello Checklists -> either a multilineText field with bullet items OR (for richer tracking) a linked child table.
-   Trello Power-Ups -> replicate as Airtable native features (Calendar Power-Up -> Calendar view; Card Aging -> formula field; Voting -> checkbox or count rollup).
-   Trello Custom Fields -> typed Airtable fields.

Stumbling blocks:

-   Trello is so simple that customers rarely have rich-enough data to justify a complex Airtable schema. Default to the lightweight (2-3 table) shape from `references/schema-shapes.md`.
-   Trello "card descriptions" are markdown-formatted; Airtable's multilineText is plainer. Decide whether to keep markdown source or render to plain text.

Schema mapping: Board -> Table; List -> status singleSelect; Card -> Record; Label -> multipleSelects; Checklist -> linked records or multilineText.

Look up at execution time:

-   Native Airtable sync for Trello?
-   Trello API specifics (Trello is owned by Atlassian; check current API/auth/pricing-tier gating).
-   Trello webhooks.
-   Trello MCP server (Atlassian has been investing in MCP -- check the broader Atlassian / Trello surface).

## Notion

Hybrid doc + database -- partial migration is often the right answer (keep Notion for narrative docs; move structured data to Airtable).

Source pattern: Pages with embedded databases. Properties (typed). Relations between databases. Inline databases. Linked databases.

What's preserved across most migration mechanics: database rows as records, properties as fields, relations as linked records, dates, assignments.

What reshapes:

-   Notion Page hierarchy (nested pages) doesn't have an Airtable equivalent. Decide which pages become Airtable tables vs. which stay as Notion docs linked via URL.
-   Notion Rich text formatting -> Airtable multilineText (plainer). Pages with heavy formatting may stay in Notion.
-   Notion Inline databases -> standalone Airtable tables; clean up the page-context coupling.
-   Notion Linked databases (views) -> Airtable views with filters.
-   Notion Synced blocks -> no Airtable equivalent; usually drop.
-   Notion Formulas -> rewrite in Airtable formula syntax (mostly compatible, some functions differ).

Stumbling blocks:

-   Many Notion users have pages-as-databases-of-databases -- flatten and decide what becomes a table vs. what stays as a field.
-   Notion's narrative-doc culture often coexists with database use -- clearly scope what's migrating vs. what stays in Notion.

Schema mapping: Notion Database -> Airtable Table; Notion Property -> typed field; Notion Relation -> linked record; Notion Rollup -> Airtable rollup field; Notion Formula -> Airtable formula.

Look up at execution time:

-   Native Airtable sync for Notion?
-   Notion API specifics (auth, rate limits, pricing-tier gates).
-   Notion webhooks.
-   Notion MCP server (official Notion MCP exists; verify current capabilities).

## Basecamp

Less common, but real for older small-team setups. Note: there are multiple Basecamp generations (Basecamp Classic, Basecamp 3, current Basecamp) with different data shapes -- confirm version before migration.

Source pattern: Projects -> Message Board / To-Dos / Schedule / Files / Campfire chat. Less structured than the others.

What's preserved across most migration mechanics: to-do items, dates, assignments, attachments, some comment threads.

What reshapes:

-   Basecamp Message Board -> Airtable record comments OR a linked Notes table (if discussion needs to live alongside records). Often the right answer is "stop the message-board habit; use comments on the work records instead."
-   Basecamp Schedule -> Airtable Calendar view.
-   Basecamp Campfire chat -> not migrated; archive separately.
-   Basecamp Files -> Airtable Attachments OR Box / Drive integration.

Stumbling blocks:

-   Basecamp's narrative / conversational style doesn't translate to Airtable's structured fields cleanly. Decide what to migrate vs. what to archive.
-   Confirm Basecamp version before planning the migration -- different generations have different export shapes.

Schema mapping: Basecamp Project -> Airtable record (or Table for very large projects); To-Do -> Record; Schedule item -> Calendar-keyed Record.

Look up at execution time:

-   Native Airtable sync for Basecamp?
-   Basecamp API specifics (varies by version).
-   Basecamp webhooks.
-   Basecamp MCP server.

## MS Planner / MS To Do

Simple task lists from the Microsoft 365 stack.

Source pattern: Plans -> Buckets -> Tasks. Labels. Assignments. Less structured than Asana / Monday.

What's preserved across most migration mechanics: tasks, buckets, assignments, due dates, labels.

What reshapes:

-   Planner Buckets -> status singleSelect.
-   Planner Labels -> multipleSelects.
-   Planner integrations with Teams -> Airtable's Teams notification integration covers most of the value.

Stumbling blocks:

-   Planner is light enough that customers often question whether migration is worth the effort. The answer is yes when they're already adopting Airtable for other airtable-marketing-ops use cases -- consolidation is the win.

Schema mapping: Plan -> Table or singleSelect; Bucket -> singleSelect; Task -> Record.

Look up at execution time:

-   Native Airtable sync for MS Planner / Microsoft 365?
-   Microsoft Graph API specifics for Planner / To Do (auth, scopes, rate limits).
-   Microsoft Graph webhooks / change notifications.
-   Microsoft 365 MCP server (Microsoft has been investing heavily in MCP -- check current state).

## MS Project

Heavier -- Gantt-focused, dependency-rich.

Source pattern: Tasks with FS / SS / FF / SF dependencies, Gantt timelines, resource leveling, baseline tracking.

What's preserved across most migration mechanics: tasks, dates, dependencies (FS only -- see below), assignments, baseline (with reshape).

What reshapes:

-   MS Project Gantt view -> Airtable Gantt view (base-only) or Gantt layout in Timeline view (works in bases and Interfaces). Critical path is auto-computed by Airtable's Gantt; no manual formula needed.
-   MS Project Resource leveling -> Airtable Capacity table with utilization rollups (manual leveling).
-   MS Project Baseline-vs-actual tracking -> custom fields: `Baseline start`, `Baseline end`, `Variance` (formula). Airtable's Gantt doesn't track baselines natively; this is a manual snapshot pattern.
-   MS Project dependency types (FS / SS / FF / SF) -> Airtable supports FS only via a self-linking `Predecessors` field on the Tasks table (one linked-record field, not a separate Dependencies table). SS / FF / SF links don't translate natively; flag them for manual coordination during migration. See `support.airtable.com/docs/gantt-view-milestones-dependencies-and-critical-paths`.
-   MS Project milestones -> tasks with End date set and Start date empty (Airtable's Gantt renders these as diamonds when "Use milestones" is toggled on).

Stumbling blocks:

-   MS Project's Gantt-and-resource-leveling features are genuinely deep. PMs migrating from MS Project may want to keep MS Project for one specific Gantt-heavy workflow while putting everything else into Airtable. Partial migration is fine.
-   Heavy customers may have decades-old project plan templates -- audit before migrating.

Schema mapping: MS Project Task -> Airtable Task record; Dependency -> self-linking `Predecessors` field on the Tasks table (Airtable's official Gantt model -- not a separate Dependencies table); Resource -> Airtable Team Members table (or Capacity table).

Look up at execution time:

-   Native Airtable sync for MS Project? (Likely not -- but check.)
-   MS Project file formats (`.mpp`, XML export); current MS Project import/export tooling.
-   Microsoft 365 MCP server.

## Jira (for non-engineering marketing work)

When migrate vs. when integrate: for engineering work (story tracking, sprint planning, deploys), Jira is typically integrated (bidirectional sync at epic level) -- see the `airtable-product-ops` skill's engineering-tracker patterns. For marketing work bottlenecked in Jira (e.g., marketing requests filed as Jira issues because Engineering owns Jira), migration to Airtable makes sense for the marketing-side workflow, while leaving the engineering side in Jira.

Source pattern: Projects -> Epics -> Stories -> Subtasks. Custom Issue Types. Workflows. Components. Versions.

What's preserved across most migration mechanics: issues, custom fields, links, status, assignments, comments.

What reshapes:

-   Jira complex workflows -> simpler singleSelect statuses. Consolidate where possible.
-   Jira Sprints -> if marketing work isn't sprint-shaped, drop; if it is, rebuild as Airtable Sprints table.
-   Jira Components -> multipleSelects field or linked records.
-   Jira Versions -> multipleSelects or linked Releases table.

Stumbling blocks:

-   Marketing-in-Jira often exists because Engineering owns the Jira instance; migrating off Jira may require re-wiring upstream submission flows.
-   Keep Jira sync if engineering downstream work matters (marketing requests that need engineering implementation).

Schema mapping: Jira Project -> Airtable view filter or singleSelect; Jira Issue -> Record; Jira Epic -> linked parent record; Jira Custom Field -> typed field.

Look up at execution time:

-   Native Airtable sync for Jira is established (Airtable's Jira sync is one of its flagship integrations -- verify current capabilities and any recent changes).
-   Jira REST API specifics (Atlassian's current API; auth via OAuth or PATs).
-   Jira webhooks.
-   Atlassian MCP server / Rovo's MCP surface (Atlassian has been investing heavily in MCP).

## What to do AFTER migration

Once data is in Airtable, hand off the UI configuration steps per the standard build-plan output (see `references/build-shapes.md`):

-   Calendar / Kanban / Timeline views on the primary tables
-   Interface page(s) for the stakeholder audience
-   Form view for ongoing intake
-   Automations matching the source tool's most-used automations
-   Sync setup to the integrations they're keeping (MAP, CRM, DAM if external)

Validate with the team in parallel mode before decommissioning the source tool. Then close licenses and archive the old export data.
