---
name: carta-consolidating-balance-sheet
model: sonnet
description: 'Generate a consolidating Balance Sheet for all entities under a firm for a given month and write it as a side-by-side Excel tab with Assets / Liabilities / Equity sections and a Total column. Sourced from Carta MCP (firm/entity resolution + DWH SQL). TRIGGER when the user asks for "balance sheet of all entities of [firm] for [month]", a consolidating BS by entity, or to replicate the "Balance Sheet - consolidating" tab format for a different firm/period. Trigger phrases include "consolidating balance sheet", "BS by entity", "balance sheet of all entities". DO NOT TRIGGER for single-entity BS, P&L / income statement (carta-consolidating-pnl), new budgets (carta-create-budget), pulling Carta-stored budgets (carta-fetch-budget), refreshing actuals (carta-budget-actuals), pacing (carta-budget-vs-actuals), or what-if (carta-budget-scenarios).'
version: 1.0.0
---

## Cline Compatibility

Use the plugin-owned `carta` MCP server in Cline and default to local-file workflow. Ignore later source-host instructions that say to call `refresh_mcp_connectors`, choose a Claude for Excel runtime, use `execute_office_js`, probe duplicate `mcp__<SERVER>__...` prefixes, or write into host-specific preview state. Set `<SERVER>` to `carta` when a source example uses that placeholder. Use the available `mcp__carta__...` tools or the equivalent Carta tool exposed by the MCP server. When examples use `${CLAUDE_PLUGIN_ROOT}/scripts/...`, resolve the helper from `../../scripts/...` relative to this skill directory. When examples use `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/assets/...`, resolve the asset from this skill directory. Do not create, overwrite, or mutate a workbook until the user explicitly approves the destination and exact write.

[PATTERN carta-writing-style v0.0.2]
[PATTERN etiquette v0.0.6]
[PATTERN text v0.0.8]
[PATTERN tables v0.0.12]
[PATTERN carta-watermark v0.0.10]
[PATTERN base v0.1.0]

# Consolidating balance sheet

Generates a side-by-side Balance Sheet across every entity under a firm for a
single month, matching the "Balance Sheet - consolidating" tab format. The
data is pulled live from Carta's DWH via the Carta MCP connector -- nothing is
embedded in the skill.

This source workflow was originally written for an Excel add-in. In Cline, use local-file mode. The audience
is an accountant working in their workbook, not an engineer running CLI
commands.


## When to use

Trigger this skill when the user asks for any of the following:

- "Give me the balance sheet of all the entities of `<FIRM>` for `<MONTH>`"
- "Consolidating balance sheet for `<FIRM>`"
- "BS by entity for `<FIRM>` `<MONTH>`"
- Any request to replicate the "Balance Sheet - consolidating" tab structure
  for another firm/period

Do NOT use this skill for:

- Single-entity balance sheets (use a plain trial-balance / GL query instead)
- P&L / income statement requests (use the carta-consolidating-pnl skill)
- Historical multi-period BS (this skill is point-in-time, single month)

## UX Rules

This skill ships as a standalone Claude for Excel skill, so the Carta CLI
session-start hook does not apply. The following rules -- normally enforced
globally by the hook -- are the skill's own responsibility here:

- Speak plain English to the user. The audience is an accountant.
  Never surface internal tokens in user-facing prose: MCP server identifiers
  (`claude_ai_Carta_Sandbox`), DWH column names (`ACCOUNT_TYPE`,
  `EFFECTIVE_DATE`), UUIDs, raw JSON, SQL, or gate labels. Those belong in
  Cline's reasoning, not on screen.
- Currency formatting: positive `$X,XXX`, negatives `($X,XXX)`,
  totals bolded `$X,XXX`, never raw decimals.
- Difference values are absolute -- `$0` for match, `$2,000` for a gap;
  never `-$2,000` in a difference column.
- Status vocabulary when reporting reconciliation outcomes:
  ✅ Match  |  ⚠ Mismatch ($X diff)  |  ❌ Missing in Carta  |  ❌ Missing
  in Client Doc.
- Citation links -- when pointing to the resulting Excel range, format as
  `[A1:I65](<citation:Balance Sheet - Acme Mar-26!A1:I65>)` so the user
  can jump into the workbook. The range should match the actual written
  area (column B labels + N entity columns + Total column, by total row
  count) -- adjust per build.
- No environment URLs. This skill builds Excel output, not Carta web
  links. There is no `BASE_URL` to construct.

## Environment detection (Claude for Excel)

This skill does not call `carta auth-status` -- that command isn't
available inside the Excel add-in. Instead, the active Carta environment is
detected at Gate 0 from the connected MCP server's prefix
(`mcp__claude_ai_Carta_<Env>__fetch`). Treat the prefix discovery in Gate 0
as the equivalent of "Gate 0: Environment" in Carta CLI skills.

## Inputs to collect

Before running, confirm with the user:

1. Firm name -- must match a firm reachable from the active Carta MCP
   context (resolved fuzzily). Example: `Acme Ventures`.
2. Month -- format as `YYYY-MM` (e.g. `2026-03` for March 2026). The
   period is cumulative as-of month-end by default, not month-only
   activity (see `references/schema.md` for why).

If the user gave both in the request (e.g. *"balance sheet of all entities of
Acme Ventures for March 2026"*), proceed without re-asking.

---

## Execution discipline

Execute all gates silently. Do not narrate tool calls, intermediate results, or status updates. Only speak at explicit decision points: Gate 2 (entity scope picker), Gate 5 (pre-build review and approval), Gate 6 (output destination), and Gate 8 (post-action menu).

---

## Entry mode -- fresh session vs. chained skill

Before Gate 0, check whether these context variables are already set from an earlier skill call in the same session (e.g. chained from `carta-consolidating-pnl`):

- `<SERVER>` -- connected Carta MCP server prefix
- `<FIRM_NAME>` and `<FIRM_UUID>` -- the resolved firm

If both are in context: skip Gate 0 entirely. In Gate 1, skip the `contexts:list` lookup -- but still call `set_context(firm_id=<FIRM_UUID>)` with the already-known UUID to re-anchor the MCP session scope (a prior skill's scope can be reset by a new turn or connector refresh between invocations), then proceed to `fa:list:entities` to enumerate entities for Gate 2.

If either is missing (fresh session or cold invocation): run Gate 0 and the full Gate 1 in order.

Do not ask "which firm?" when it is already established from the skill the user just ran.

---

## Gate 0: Identify the Carta MCP environment

In Cline, set `<SERVER>` to `carta` and use the plugin-owned Carta MCP server. If `mcp__carta__welcome` or an equivalent Carta welcome tool is exposed, call it first. Do not call `refresh_mcp_connectors` or probe alternate server prefixes in Cline.

If the Carta MCP tools are unavailable, tell the user that Carta authorization or the plugin-owned MCP connection is required and stop. If the source text below references multiple connected Carta prefixes, ignore that host-specific path and keep `<SERVER>` as `carta`.

---

## Gate 1: Resolve the firm and its entities

1. `call_tool({"name": "contexts__list", "arguments": {"firm_name": "<FIRM>"}})` to find
   the firm. If multiple matches, present them via `ask the user` and
   confirm.
2. `set_context(firm_id=<uuid>)` to scope the session.
3. `call_tool({"name": "fa__list__entities"})` to enumerate every entity under
   the firm.

Prefer the granular tool when the server exposes it -- one fewer hop, sidesteps `fetch`'s param-shape quirks:

| Granular tool | Generic equivalent |
|---|---|
| `mcp__<SERVER>__list_contexts(firm_name="<entity>")` | `call_tool({"name": "contexts__list", "arguments": {"firm_name": "<entity>"}})` |
| `mcp__<SERVER>__set_context(firm_id="<uuid>")` | `call_tool({"name": "set_context", "arguments": {"firm_id": "<uuid>"}})` |

For DWH queries (`dwh:execute:query`, `dwh:list:tables`, `dwh:get:table_schema`) there is no granular equivalent -- always go through `call_tool({"name": "...", "arguments": {...}})`.

Each entity returned from step 3 (`fa:list:entities`) has the display name, `entity_id`, and a type field (e.g. `entity_type` -- usually one of `FUND`, `GP`, `MANAGEMENT_COMPANY`, `SPV`, `HOLDING`, depending on the firm's structure). Cache the full list -- Gate 2 reads from it.

DWH param-name traps -- these cost a retry every time:
- `dwh:execute:query` takes `sql:`, not `query:` (the trailing `:query` in the command name is not the param key).
- `dwh:get:table_schema` takes `table_name:`, not `table:`.

Don't query `FUND_ADMIN` for entity metadata; the JE table is denormalized
and `FUND_NAME` is on every row.

Done when: the firm is locked and the full entity list (with type, if
available) is cached.

---

## Gate 2: Choose entity scope

Before pulling data, ask the user which entities to include. The default
("All entities") matches the legacy consolidating-BS behavior; the others
let the accountant trim noise from the output before any Excel write
happens.

Show a short summary first so the user knows what they're choosing from:

> 6 entities found under Acme Ventures:
> - Funds (3): Acme Fund I, Acme Fund II, Acme Opportunity
>   Fund
> - Other (3): Acme Co-Invest (SPV), Acme GP LP (GP),
>   Acme SPV-1 (SPV)

(Group entities by `entity_type` if the field is available; otherwise
group by name pattern -- common fund-name tokens are `Fund`, `LP`, `LLC`
with `Fund` in the name. Be conservative -- when in doubt, surface the
entity in "Other".)

Then ask via `ask the user`:

```
Which entities should the Balance Sheet include?
1 - All entities (6)  <- recommended
2 - Funds only (3) -- only fund-type entities
3 - Pick from a list -- choose specific entities
4 - Type the names -- comma-separated
```

Handle each branch:

- 1 -- All entities -> keep every entity from Gate 1.
- 2 -- Funds only -> filter to entities whose `entity_type == "FUND"`.
  If `entity_type` is not present in the API response, fall back to a
  conservative name pattern (case-insensitive `Fund` token in the
  display name). Show the resulting filtered list and confirm with
  `ask the user` before continuing -- "Use these 3? Or pick
  individually?"
- 3 -- Pick from a list -> present a multi-select `ask the user`
  where each option is one entity name. Require at least one selection.
- 4 -- Type the names -> accept a comma-separated list as free text.
  Fuzzy-match each token against the cached entity names; show the
  resolved list and any unmatched tokens; confirm via `ask the user`
  before continuing. If any tokens are unmatched, loop until they're
  resolved or the user removes them.

Lock the chosen list as `<entity_scope>` and use it in Gate 3.

Wait for the user to confirm before continuing.

If the user picks an option that resolves to zero entities, stop and ask
them to re-pick -- never run the BS query with an empty entity scope.

Done when: `<entity_scope>` is a non-empty, user-confirmed list of
entity display names from the Gate 1 cache.

---

## Gate 3: Pull journal entries

The schema and sign conventions for the Carta DWH journal-entries
table are documented in `references/schema.md`. Load that file now
and apply its rules.

Default query -- cumulative as-of (this is what balances):

```sql
SELECT FUND_NAME, FUND_UUID, ACCOUNT_TYPE, ACCOUNT_NAME, SUM(AMOUNT) AS BALANCE
FROM <journal_entries_table>
WHERE FIRM_ID = '<firm_uuid>'
  AND EFFECTIVE_DATE <= '<YYYY-MM-DD month_end>'
  AND ACCOUNT_TYPE BETWEEN '1000' AND '3999'
  AND FUND_NAME IN (<comma-separated entity_scope names, quoted>)
GROUP BY 1, 2, 3, 4
ORDER BY FUND_NAME, ACCOUNT_TYPE
```

Use a `FUND_NAME IN (...)` clause only when `<entity_scope>` is not
the full Gate 1 list (i.e. the user picked options 2, 3, or 4). When the
user picked "All entities" (option 1), omit the `FUND_NAME` filter so the
query plan stays simple.

Single-quote each name in the `IN (...)` clause and escape any embedded
single quotes by doubling them (e.g. `O'Connor` -> `'O''Connor'`).

### DWH result formatting -- keep the response small

For monthly / per-account / per-period activity queries that return more than ~50 rows, request `format: "ndjson"` and bucket the result into a blob (`store_blob` / `blobs.setJSON` / the runtime equivalent) before working with it. Do not paste large query results back into the conversation -- they trigger `context_snip`, which can compress your Gate 4 / Gate 5 checks out of user visibility.

Supported `format` values for `dwh:execute:query`:
- `markdown` -- best for small (<=50 row) results that you want to show the user.
- `ndjson` -- best for large results processed by code/agent.
- `csv` is NOT supported. Do not try it.

Run via `call_tool({"name": "dwh__execute__query", "arguments": {"sql": "..."}})`.
SELECT-only.

Period-only variant (`EFFECTIVE_DATE BETWEEN <month_start> AND
<month_end>`) -- run only if the user explicitly asks for "this month's
activity" or "period-only." Warn them first: it will not balance, because BS
accruals booked during the month have offsetting P&L entries excluded by the
`ACCOUNT_TYPE` filter.

If the result set is large, store it in a session blob (e.g.
`blobs.setJSON("bs_data", ...)`) instead of carrying it in the prompt.

### Resolve the presentation currency (`<fund_currency>`)

The number format in `references/formatting.md` is built from `<fund_currency>` --
resolve it here, do not assume USD:

1. Probe the journal-entries table for a currency column:
   `call_tool({"name": "dwh__get__table_schema", "arguments": {"table_name": "<journal_entries_table>"}})`.
   If it exposes a currency column (e.g. `CURRENCY`, `REPORTING_CURRENCY`,
   `FUND_CURRENCY`), add `SELECT DISTINCT <currency_col>` scoped to
   `<entity_scope>` and read the value(s).
2. If exactly one distinct currency comes back, set `<fund_currency>` to it.
3. If the column doesn't exist, or the scope spans multiple currencies
   (a consolidating BS that mixes currencies cannot be summed into one Total
   column -- see the no-cross-currency rule), ask the user via
   `ask the user`: *"What presentation currency should I use for this
   consolidating balance sheet?"* Store the answer as `<fund_currency>`.

Never silently default to USD.

Done when: the period dataset is loaded (covering only Asset / Liability /
Equity accounts) -- scoped to `<entity_scope>` -- and `<fund_currency>` is resolved.

---

## Gate 4: Classify accounts

Classify each row by the leading digit of `ACCOUNT_TYPE`, per
`references/schema.md`:

- `1xxx` -> Assets -- keep `BALANCE` as-is
- `2xxx` -> Liabilities -- multiply `BALANCE` by `-1` for positive display
- `3xxx` -> Equity -- multiply `BALANCE` by `-1` for positive display

Sort within each section by `ACCOUNT_TYPE` ascending. Use `ACCOUNT_NAME`
directly as the row label -- do not rename or consolidate accounts.

Done when: every account has a section and a positive display value.

---

## Gate 5: Pre-build review

Before touching the user's workbook, show a plain-English preview so the
accountant can sanity-check the build and edit if anything looks off. This
is the pre-flight checkpoint -- no Excel changes happen until the user
explicitly confirms.

Present a short, scannable summary. Echo back the scope choice from Gate
2 so the user can see exactly what's in and what's out:

> Ready to build the Balance Sheet -- please review.
>
> - Firm: Acme Ventures
> - Period: as of March 31, 2026 (cumulative)
> - Entity scope: Funds only (3 of 6) -- Acme Fund I, Acme
>   Fund II, Acme Opportunity Fund
>   *(Excluded: Acme Co-Invest, Acme GP LP, Acme SPV-1.)*
> - Accounts found: 22 Assets, 11 Liabilities, 7 Equity (40 total)
> - Sheet name: `Balance Sheet - Acme Mar-26`

If the user picked "All entities" in Gate 2, render the scope line as:

> - Entity scope: All entities (6) -- Acme Fund I, Acme Fund
>   II, Acme Co-Invest, Acme GP LP, Acme Opportunity Fund,
>   Acme SPV-1

Then ask with `ask the user`:

```
1 - Build it  <- recommended
2 - Change the firm or period
3 - Change the entity scope
4 - Cancel
```

Handle each branch:

- 1 -- Build it -> proceed to Gate 6.
- 2 -- Change firm or period -> return to Inputs, re-run Gates 1-4 with
  the new values, then present this review again.
- 3 -- Change the entity scope -> return to Gate 2 (the
  entity-scope picker). On confirm, re-run Gates 3-4 with the new scope,
  then present this review again.
- 4 -- Cancel -> stop the skill cleanly.

Loop until the user picks "Build it" or cancels. Never write to Excel
based on inferred intent.

Do not surface internal field names (`ACCOUNT_TYPE`, `FUND_NAME`,
`EFFECTIVE_DATE`) or UUIDs in this review -- translate to plain accountant
language ("accounts", "entities", "as of ...").

Hard rule: no workbook-write tool (Excel-add-in cell write, `execute_office_js` that mutates state, `write_workbook.py`, or any equivalent) runs before this gate's `ask the user` returns the user's explicit "Approve and write" choice. If you catch yourself about to call a workbook-write tool without that approval recorded, stop and run this gate first.

Done when: the user has confirmed the build, with their chosen firm,
period, and entity scope locked in.

---

## Gate 6: Decide the output destination

In Cline, use local-file mode and the bundled workbook helpers.
Before writing anything, decide whether to write into the user's currently
open workbook or to create a new one.

1. Check for an active workbook. Use the Excel add-in's
   "active workbook" / "current workbook" tool (whatever name the add-in
   exposes at runtime) to see if there is a workbook open in front of the
   user.
2. If a workbook is open:
   - Read the workbook name and the list of existing sheet/tab names.
   - Ask the user, via `ask the user`, whether you may add a new tab to
     it. Phrase the question concretely so they know exactly what's about
     to happen. Example:
     > "You have `<workbook name>.xlsx` open. May I add a new tab called
     > `Balance Sheet - Acme Mar-26` to it?"
     > Options:
     > - "Yes, add the tab here" -- proceed with the active workbook
     >   as the destination.
     > - "No, create a new workbook instead" -- create a fresh
     >   workbook.
     > - "Cancel" -- stop the skill.
   - If the new sheet name would collide with an existing tab, append a
     numeric suffix (`... Mar-26 (2)`) and mention the rename to the user
     in Gate 8's report. Truncate to Excel's 31-character limit
     after suffixing.
3. If no workbook is open:
   - Create a new workbook silently. Name it `Balance Sheet -
     <FIRM-SHORT> <MMM-YY>.xlsx` (e.g. `Balance Sheet - Acme
     Mar-26.xlsx`). The first sheet is the consolidating Balance Sheet
     tab.
   - Tell the user, in one sentence, that you created a new workbook
     because nothing was open.
4. If the user cancels or denies edit permission for the active
   workbook and picks "Cancel": stop the skill cleanly. Don't fall
   back silently to creating a new file.

Lock the chosen `<destination workbook>` and `<sheet name>` and use them
through Gate 7 and Gate 8.

Done when: the destination workbook + target sheet name are known and
the user has explicitly consented to any edit to a pre-existing workbook.

---

## Gate 7: Build and brand the output sheet

### Approval-recorded check (run FIRST, before any write tool)

Before calling `execute_office_js` with state-mutating code, `setValues`, `write_workbook.py`, or any other workbook-write tool, look back at your tool history. Find the most recent `ask the user` you sent. Does its answer literally include `"Build it"` (the Gate 5 build-approval)? If NO, Gate 5 did not pass -- send the Gate 5 approval menu now and wait for the explicit answer.

Do not interpret upstream answers as approval. An entity-scope response from Gate 2, a destination response from Gate 6, or any prior `ask the user` whose answer is not literally a build-approval choice does NOT clear this gate.

### Gate 7 requires AT LEAST three separate `execute_office_js` calls (excel-addin runtime)

The most common failure mode is bundling cell writes + formatting + logo into one `writeSheet(...)` function -- the model writes the cells, returns, and forgets the logo. Do not combine the cell-write call with the brand block in a single office.js block.

- Call 1: cell values, formulas, formatting. One `execute_office_js`. Return.
- Call 2: logo on the BS tab via the verbatim brand block below.
- Call 3 (verification, LAST): load shape names on the BS tab, confirm `CartaLogo` exists.

Returning from Call 1 does NOT finish Gate 7. The verification call must appear in your tool history before Gate 8.

Read `references/formatting.md` now and apply its layout exactly. That file
covers sheet name, header rows, section headers, subtotal/grand-total rows,
the Total column, number formats, column widths, font, and the "do not
include" list.

Also read [`references/branding-and-header.md`](references/branding-and-header.md) for the standard 4-row metadata band (B1 firm / B2 descriptive title like `"Consolidating Balance Sheet · As of Mar-26"` / B3 source / B4 other context) and Carta logo placement (column E, rows 1-3 height). If `formatting.md` and `branding-and-header.md` disagree on where section headers start (e.g. `formatting.md` says `B5 = Assets`), the branding spec wins -- shift sections to start at row 6 or below so rows 1-4 stay reserved for metadata.

### Brand block -- verbatim, run AFTER the cell writes (DO NOT SKIP)

The output sheet is not "built" until it carries a `CartaLogo` shape. Use the verbatim brand block from [`references/branding-and-header.md`](references/branding-and-header.md) -- substitute `<TAB_NAME>` with the BS tab name. Asset access via `blobs.getText("assets/powered_by_carta.b64.txt")` -- NOT `Read` or filesystem paths.

Brand-verification call (REQUIRED, observable). Run this as a separate `execute_office_js` call before proceeding to Gate 8:

```javascript
const sheet = context.workbook.worksheets.getItem("<BS_TAB_NAME>");
sheet.shapes.load("items/name");
await context.sync();
return sheet.shapes.items.map(s => s.name);
```

The result must include `"CartaLogo"`. If not, re-run the brand block above and re-verify. Do not proceed to Gate 8 until this verification returns `CartaLogo`. The verification call is observable evidence; without it in your tool history, Gate 7 branding is not complete.

Two critical reminders from that reference:

- Write the Total-column header (e.g. `Mar-26`) with `numFmt = "@"`
  applied before setting the value. Otherwise Excel parses it as a date
  serial.
- Every total is a `=SUM(...)` formula, never a hardcoded number. The Total
  column sums across entities; section subtotals sum down the section.

Empty entities: if an entity in `<entity_scope>` has no JE activity
through the as-of date, still include the column with zeros -- not blanks.

### Sheet-write hard rules

- `range.merge(true)` discards values in trailing cells. Never merge
  cells whose contents you still need. To add a header row above
  existing sub-headers, insert a new row first
  (`sheet.getRange("5:5").insert(...)`) and write the merged labels
  into the inserted row -- do not merge over a row that already holds
  sub-headers.
- Two-row header pattern when bucketing by period: row N = one merged
  cell per period (e.g. `Mar-26`, `Apr-26`); row N+1 = sub-headers if
  any. Never write the period label and any sub-headers into the same row.
- The date-serial trap (already called out above for the Total-column
  header) applies to every cell where you write a month/period string.
  Set `numFmt = "@"` before the value, or apply
  `numberFormat: "mmm yyyy"` to a real date in the same write.

Done when: the sheet exists with one column per entity in
`<entity_scope>`, all account rows, all subtotals, and the grand-total
row, all driven by formulas.

---

## Gate 8: Verify and report

Gate 8 precondition (DO NOT SKIP). Before sending the report text below, scan your tool history. Three anchors MUST be present in that order:

1. An `ask the user` whose answer included `"Build it"` (Gate 5 build-approval).
2. A `sheet.shapes.addImage(base64)` call for the BS tab -- Gate 7 branding.
3. The branding-verification `execute_office_js` whose result included `"CartaLogo"` -- Gate 7 verification.

If any anchor is missing, you have skipped a gate. Do NOT report build success when no `shapes.addImage` call appears in your tool history. STOP, go back, run the missing gate, then return here.

After writing:

1. Read back the `Total Assets` and `Total Liabilities and Equity` rows.
   They should match per entity (BS must balance).
2. Flag any entity where `|Total Assets - Total Liabilities and Equity| >
   1000` (more than $1k off in raw dollars). Imbalance usually means the
   COA has accounts that didn't classify cleanly into Assets, Liabilities,
   or Equity.

Report structure:

Lead with a one-line confirmation, then a Key tie-outs block, then the
detail. Status vocabulary: ✅ Match, ⚠ Mismatch ($X diff).

> The Balance Sheet is ready in `Acme Q1 Reporting.xlsx` -- tab
> [Balance Sheet - Acme Mar-26](<citation:Balance Sheet - Acme Mar-26!A1:I65>).
>
> Key tie-outs (per-entity foot, Assets vs Liabilities & Equity):
>
> | Entity | Total Assets | Total Liab & Equity | Difference | Status |
> |---|---:|---:|---:|---|
> | Acme Fund I | $48,210,300 | $48,210,300 | $0 | ✅ Match |
> | Acme Fund II | $22,815,900 | $22,815,900 | $0 | ✅ Match |
> | Acme Co-Invest | $6,440,775 | $6,440,775 | $0 | ✅ Match |
> | Acme GP LP | $1,228,100 | $1,228,100 | $0 | ✅ Match |
> | Acme Opportunity Fund | $13,902,440 | $13,902,440 | $0 | ✅ Match |
> | Acme SPV-1 | $3,118,650 | $3,118,650 | $0 | ✅ Match |
>
> 6 entities checked. 6 matched, 0 mismatched.
>
> 51 accounts written across 6 entity columns + Total column.

If any entity does not foot, surface its row with status `⚠ Mismatch
($X diff)` and a short note pointing the user at the likely cause
(unclassified account, COA digit drift, period-only variant ran by
mistake).

Then offer the post-action menu:

The next-step menu MUST be a single `ask the user` call with the options below as `options` entries. Never render them as a numbered markdown list, a bulleted list, or inline prose -- bare-text menus break the chooser UI in Claude for Excel and force the user to type the number. The `<- recommended` marker goes inside the `description` field of one option, not as a suffix on the `label`.

1. Build the P&L for the same firm and period <- recommended
2. Build the Balance Sheet for a different period
3. I'm done

When the user selects an option, load the corresponding bundled Cline skill before doing any work. Do not freelance the output -- apply the downstream skill's gates, layout spec, branding rules, and approval flow. Routing:

| Option | Skill to invoke |
|---|---|
| 1 -- Build the P&L | `carta-consolidating-pnl` |
| 2 -- Build the Balance Sheet for a different period | `carta-consolidating-balance-sheet` re-entry with the new period |
| 3 -- I'm done | No invocation; close cleanly |

Done when: sheet exists, Key tie-outs reported with status per entity,
post-action menu rendered.

---

## Schema discovery

The skill queries the Carta DWH journal-entries table. If column
names are needed, look up the table via the Carta MCP DWH schema
command once at Gate 0 -- production schema is canonical. Don't embed
column listings inline; the DWH contract can drift.

## Error handling

| Symptom | Likely cause | What to tell the user |
|---|---|---|
| No Carta MCP tool present | The Carta connector isn't enabled in this Claude for Excel session | "I can't see your Carta connector. Open Settings -> Connectors in Claude, enable Carta, then ask me again." |
| `contexts:list` returns no firm | Firm name typo, or the user's MCP context doesn't include this firm | Echo back the name and ask for confirmation or an alternative spelling. Don't silently pick a near-match. |
| `contexts:list` returns multiple firms | Common short names match several firms | Show the candidates via `ask the user` and let the user pick. |
| Query returns 0 rows | No JE activity for the firm through the as-of date | "I didn't find any journal entries for this firm through Mar 31, 2026. Double-check the period or confirm books are open for that month." |
| Query times out | DWH load, or unusually large date range | Tell the user the query is slow and offer to retry with the same parameters -- never auto-retry. |
| BS doesn't balance per entity | COA accounts not in 1xxx/2xxx/3xxx, or period-only variant ran by mistake | Surface the per-entity imbalance in Gate 8's Key tie-outs table. Suggest reviewing the unclassified accounts. |
| Auth / permission error from MCP | The user's Carta session expired or lacks DWH access | Tell them to reconnect Carta in Settings -> Connectors. Do not retry automatically. |

Never auto-retry a failed command. Always surface the failure and let the
user decide whether to retry.

---

## Do NOT

- Don't skip Gate 2 by inferring entity scope from chat. User must explicitly pick -- even if the prompt says "all entities", echo the resolved list and confirm.
- Don't run BS query with empty entity scope. Zero entities -> stop, ask user to re-pick.
- Don't include Eliminations, Topside Adjustments, or prior-period columns. Only non-entity column is Total.
- Don't rename accounts. Use `ACCOUNT_NAME` from JE verbatim.
- Don't run period-only variant without explicit opt-in and a "won't balance" warning.
- Don't claim success without re-reading and verifying per-entity balance in Gate 8.
- Don't skip branding. Gate 8 report must not run until the tab carries `CartaLogo` on column E -- see [`references/branding-and-header.md`](references/branding-and-header.md).
- Do NOT freeze panes on this tab.
