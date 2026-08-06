---
name: carta-budget-actuals
model: opus
description: 'Write actuals into an existing Excel budget workbook from Carta MCP -- add/interleave Budget/Actual/Variance columns or a tag-view tab. TRIGGER: refresh/sync/add actuals, interleave Budget/Actual/Variance, actuals by department/cost center/tag, add next month/period column, extend budget through [month]. NOT: pacing or "how are we doing"/variance-analysis questions (carta-budget-vs-actuals), new budgets (carta-create-budget), fetch-budget, scenarios, consolidating P&L / balance sheet.'
version: 1.0.1
---

## Cline Compatibility

Use the plugin-owned `carta` MCP server in Cline and default to local-file workflow. Ignore later source-host instructions that say to call `refresh_mcp_connectors`, choose a Claude for Excel runtime, use `execute_office_js`, probe duplicate `mcp__<SERVER>__...` prefixes, or write into host-specific preview state. Set `<SERVER>` to `carta` when a source example uses that placeholder. Use the available `mcp__carta__...` tools or the equivalent Carta tool exposed by the MCP server. When examples use `${CLAUDE_PLUGIN_ROOT}/scripts/...`, resolve the helper from `../../scripts/...` relative to this skill directory. When examples use `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/assets/...`, resolve the asset from this skill directory. Do not create, overwrite, or mutate a workbook until the user explicitly approves the destination and exact write.

[PATTERN carta-writing-style v0.0.2]
[PATTERN etiquette v0.0.6]
[PATTERN text v0.0.8]
[PATTERN tables v0.0.12]
[PATTERN carta-watermark v0.0.10]
[PATTERN menus-and-flows v0.0.7]
[PATTERN base v0.1.0]

# Budget actuals

Entry point for updating actuals in an existing budget. Six references:

- [`references/add-actuals-columns.md`](references/add-actuals-columns.md) -- Layout A: interleave Budget / Actual / Variance per month on the Budget tab (recommended for active tracking).
- [`references/add-actuals-tab.md`](references/add-actuals-tab.md) -- Layout B: add a peer `<year> Actuals` tab alongside the Budget tab.
- [`references/refresh-existing.md`](references/refresh-existing.md) -- Layout C: overwrite stale actuals cells in columns that already exist.
- [`references/add-period.md`](references/add-period.md) -- Layout D: append the single next month/quarter column.
- [`references/tag-view.md`](references/tag-view.md) -- Layout E: new tab with actuals sliced by reporting dimension (department, project code, class, etc.) and a two-row period / tag header. Only offered when the entity has tagged journal data.
- [`references/get-actuals.md`](references/get-actuals.md) -- internal helper, the canonical actuals-query routine.

## UX Rules

Audience is an accountant in Excel. Plain English only. Never surface MCP
identifiers, DWH column names, UUIDs, raw JSON, SQL, or gate labels.
Currency: `$X,XXX` positive, `($X,XXX)` negative, totals bolded.
Differences are absolute. Status: ✅ Match | ⚠ Mismatch ($X diff) | ❌ Missing in Carta | ❌ Missing in Client Doc.

Closing summary link is a workbook citation (`<citation:Sheet!Range>`) in
Claude for Excel mode, and a `file://` path in Cline local-file mode.

Every numbered choice in this skill -- including the closing
next-step menu -- must be presented as an explicit user choice. In Cline,
ask in chat or use the host question UI when available. Do not bury
choices in closing prose.

## When to use

- "Refresh the actuals on my budget"
- "Pull the latest actuals into the open budget"
- "Update my budget with March numbers"
- "The actuals are stale -- sync them"
- "Add next month's column to the budget"
- "Extend the budget through April"

## DO NOT use this skill for

- Building a new budget from scratch -- use `carta-create-budget`.
- Pulling the Carta-stored ManCo budget -- use `carta-fetch-budget`.
- Pacing / YTD vs budget / variance / "are we on track" -- use `carta-budget-vs-actuals`.
- What-if scenarios -- use `carta-budget-scenarios`.
- P&L / income statement requests -- use `carta-consolidating-pnl`.
- Balance sheet requests -- use `carta-consolidating-balance-sheet`.

---

## Execution discipline

Execute all gates silently. Do not narrate tool calls, intermediate results, or status updates. Only speak at explicit decision points: Gate 0.5 (if runtime is ambiguous), Gate 1 (destination chooser), Gate 2 (layout choice -- always ask), Gate 3 (period/parameter gate), Gate 6 (approval), and Gate 8 (next-step menu).

---

## Entry mode -- fresh session vs. chained skill

Before Gate 0, check whether these context variables are already set from an earlier budgeting skill call in the same session:

- `<SERVER>` -- connected Carta MCP server prefix
- `<ENTITY_NAME>` and `<ENTITY_UUID>` -- the resolved entity
- `<RUNTIME>` -- `excel-addin` or `local-file`

If all four are in context: skip Gates 0 and 0.5 entirely. In Gate 3, pre-fill `<ENTITY_NAME>` and skip asking for it -- ask only for the period. Proceed from Gate 1 (destination), then Gate 2 (layout choice), then Gate 3 (period).

If any is missing (fresh session or cold invocation): run Gates 0 and 0.5 in order, then continue from Gate 1.

Do not ask "which firm?" or "which runtime?" when those are already established from the skill the user just ran.

---

## Gate 0 -- Carta MCP environment + resolve firm

In Cline, set `<SERVER>` to `carta` and use the plugin-owned Carta MCP server. If `mcp__carta__welcome` or an equivalent Carta welcome tool is exposed, call it first. Do not call `refresh_mcp_connectors` or probe alternate server prefixes in Cline.

If the Carta MCP tools are unavailable, tell the user that Carta authorization or the plugin-owned MCP connection is required and stop. If the source text below references multiple connected Carta prefixes, ignore that host-specific path and keep `<SERVER>` as `carta`.

Resolve firm: if user named one -> `call_tool({"name": "contexts__list", "arguments": {"firm_name": "<entity>"}})` -> disambiguate via `ask the user` if multiple -> `set_context(firm_id=<uuid>)`.

DWH param-name traps: `dwh:execute:query` takes `sql:` not `query:`. `dwh:get:table_schema` takes `table_name:` not `table:`. `format` accepts `"ndjson"` / `"markdown"`, not `"csv"`.

If no firm was named, defer to Gate 3.

---

## Gate 0.5 -- Detect runtime

Use local-file mode in Cline with a user-supplied `.xlsx` path or a new user-approved workbook path. See `carta-create-budget/SKILL.md` Gate 0.5 for the heuristic -- same rule applies here.

If unclear, ask the user via `ask the user`:

> "How are you working with the budget -- inside Excel via Claude for
> Excel, or as a local .xlsx file in Cline?"

Store `<RUNTIME>` (`excel-addin` or `local-file`) for Gates 1, 4, 7, 8.

---

## Gate 1 -- Where to write

Branches by `<RUNTIME>`.

If `<RUNTIME>` is `excel-addin`:

Empty-workbook shortcut: if the active workbook has one sheet, `maxRows == 0`, no other tabs (typically a fresh `Book1.xlsx`/`Sheet1`), skip the chooser. Announce the rename in one sentence -- *"I'll use the empty workbook you have open and rename `Sheet1` to `<TARGET_TAB>`."* -- then proceed. The chooser only exists to protect non-empty state; an empty workbook has none. The chooser still applies whenever there is data or more than one tab.

> Where should I write the updates?

- "Update the open workbook directly -- recommended" (modify in place).
- "Update the open workbook in a new tab" (preserves the original).
- "Create a brand new workbook with the updated data".

If user picks "update directly", confirm which tab explicitly. If
multiple tabs look like budgets, ask which one.

If `<RUNTIME>` is `local-file`:

> Where is the budget file, and where should the updated version land?

- "Modify the file in place -- recommended" -- ask for the path.
- "Write a new file alongside the original" -- ask for the path; new file gets a `-updated` suffix by default.

If the user gave a path in the original prompt, skip the choice. Store
`<DESTINATION>` (open workbook + tab in add-in mode, or `.xlsx` path +
sheet name in local-file mode).

---

## Gate 2 -- Choose the layout (always ask)

Four layouts are valid for putting actuals into a workbook, and the
same prompt can plausibly mean any of them. Always ask the user
how the actuals should appear -- never assume from the prompt's
phrasing alone.

Use `ask the user`:

> How should the actuals appear in the workbook?

| # | Option | Reference loaded |
|---|---|---|
| 1 | Interleave Budget / Actual / Variance columns per month on the Budget tab <- recommended | [`add-actuals-columns.md`](references/add-actuals-columns.md) |
| 2 | Add a separate `<year> Actuals` tab alongside the Budget tab | [`add-actuals-tab.md`](references/add-actuals-tab.md) |
| 3 | Refresh existing Budget / Actual / Variance cells (the cells are there, just stale) | [`refresh-existing.md`](references/refresh-existing.md) |
| 4 | Add only the next single period column | [`add-period.md`](references/add-period.md) |
| 5 | Build a tag-view tab -- actuals sliced by reporting dimension (department, project code, class, etc.) | [`tag-view.md`](references/tag-view.md) -- only offered when the entity has tagged data; see Gate 2.5 |

Use the user's prompt only as a *hint* for which option to highlight --
never as authority to skip the question:

| Phrase in the prompt | Hint |
|---|---|
| "interleave", "Budget / Actual / Variance", "variance by month", "add `<year>` actuals" (no other clue) | Option 1 (also the default `<- recommended`) |
| "add a tab", "track on its own tab", "separate actuals tab" | Option 2 |
| "refresh", "the actuals are stale", "pull latest", "sync" | Option 3 |
| "add next month", "extend through `<month>`", "next period" | Option 4 |
| "by department", "by tag", "by cost center", "split by", "broken down by", "by reporting tag", "by project code" | Option 5 |

Option 5 availability: always show Layout E in the chooser. If the user
picks it and Gate 2.5 finds no tag data on the entity, tell them in one sentence
and fall back to Layout A automatically. Do not pre-filter the chooser -- the
entity name needed for the probe is not available until Gate 3.

The user's pick locks the reference to load for the rest of the
workflow. Immediately call `read_skill` for the chosen layout -- do not reconstruct from memory:

| Layout chosen | Call |
|---|---|
| Option 1 -- Interleave columns | `read_skill(file_path="references/add-actuals-columns.md")` |
| Option 2 -- Add actuals tab | `read_skill(file_path="references/add-actuals-tab.md")` |
| Option 3 -- Refresh existing | `read_skill(file_path="references/refresh-existing.md")` |
| Option 4 -- Add single period | `read_skill(file_path="references/add-period.md")` |

> Why we always ask: the same prompt -- "add 2026 actuals by month"
> -- can mean Option 1, 2, or 3 depending on the user's intent and the
> current state of their workbook. Guessing wrong and rebuilding costs
> the user a corrective prompt. Asking once costs one click. Choose
> the click.

---

## Gate 2.5 -- Tag-category discovery (Layout E path only)

Skip this gate entirely unless the user chose Layout E at Gate 2.

Silent probe -- no user-facing output. Layout E shows all firm tag categories side by side under each period band -- no "which dimension?" picker. The probe's job is to discover the firm's tag taxonomy from `REPORTING_TAGS_JSON` (or fall back to the flat `REPORTING_TAGS` column when only that's populated).

### Probe 1 -- Detect the JSON-vs-flat path

```
call_tool({"name": "dwh__execute__query", "arguments": {
  "sql": "SELECT
            COUNT_IF(REPORTING_TAGS_JSON IS NOT NULL) AS json_rows,
            COUNT_IF(REPORTING_TAGS IS NOT NULL)      AS flat_rows
          FROM <journal_entries_table>
          WHERE FUND_NAME = '<entity_name>'
            AND EFFECTIVE_DATE >= DATEADD('year', -1, CURRENT_DATE)",
  "format": "markdown"
}})
```

- `json_rows > 0` -> JSON path. Skip Probe 2 -- go directly to Probe 3 (JSON path). Probe 3 returns both category names and cardinality in one query, making a separate category-discovery query redundant.
- `json_rows == 0 AND flat_rows > 0` -> flat path. Set `<CATEGORIES> = ["Reporting Tag"]` and continue to Probe 3 (cardinality).
- Both zero -> no tag data on this entity. Tell the user in one plain-English sentence -- *"Your journal data doesn't have any reporting tags, so I'll build a flat actuals view instead."* -- and fall back to Layout A.

### Probe 3 -- Cardinality per category

Run one query that returns the value count per category (used to drive the wide vs long decision):

JSON path:
```
call_tool({"name": "dwh__execute__query", "arguments": {
  "sql": "SELECT f.key::TEXT AS category, COUNT(DISTINCT f.value::TEXT) AS n_values
          FROM <journal_entries_table>,
               LATERAL FLATTEN(input => REPORTING_TAGS_JSON) f
          WHERE FUND_NAME = '<entity_name>'
            AND REPORTING_TAGS_JSON IS NOT NULL
            AND EFFECTIVE_DATE >= DATEADD('year', -1, CURRENT_DATE)
          GROUP BY 1
          ORDER BY 1",
  "format": "markdown"
}})
```

Flat path:
```
call_tool({"name": "dwh__execute__query", "arguments": {
  "sql": "SELECT 'Reporting Tag' AS category, COUNT(DISTINCT REPORTING_TAGS) AS n_values
          FROM <journal_entries_table>
          WHERE FUND_NAME = '<entity_name>'
            AND REPORTING_TAGS IS NOT NULL
            AND EFFECTIVE_DATE >= DATEADD('year', -1, CURRENT_DATE)",
  "format": "markdown"
}})
```

Store `<CATEGORIES>` as the sorted list of distinct `category` values returned, and store `<CARDINALITY>` as the map of `category -> n_values`. (Probe 3 returns both in one pass -- no separate Probe 2 needed.) Compute the total column count:

```
total_columns = sum(n_values for each category) + len(<CATEGORIES>)
```

The `+ len(<CATEGORIES>)` term covers the per-category Total columns. If the run uses Quarter or Month aggregation across multiple period blocks, multiply by the number of period blocks for the layout decision.

### Wide vs long decision

The authoritative thresholds live in [`references/tag-view.md`](references/tag-view.md) §"Cardinality guard" -- `<= 24` wide / `25-36` ask / `> 36` long. Keep that file as the single source of truth; the inline cutoffs below mirror it for runtime convenience and must move together if the table changes.

If `total_columns > 24` (single period) or `total_columns × n_period_blocks > 24` (multi-period), ask via `ask the user`:

> The tag-view tab would have `<N>` columns across `<C>` categories. With that many, should I build a wide table (one column per tag per category per period) or a long table (one row per tag per account)?

- Wide -- one column per tag <- recommended for <= 36
- Long -- one row per tag per account

Store `<TAG_LAYOUT>` (`wide` | `long`). Default `wide` for <= 24 (no question asked); default `long` for `> 36` (no question asked).

---

## Gate 3 -- Batched parameter gate

In one `ask the user`, confirm every parameter the prompt didn't already specify.

Entity: confirm `<ENTITY_NAME>` -- the exact `FUND_NAME` value used in DWH queries. If the user named one at Gate 0, pre-fill it and only ask if it's ambiguous.

Period: offer smart defaults based on today's date (currently May 2026):

> What period should I pull actuals for?

| # | Label | Date range |
|---|---|---|
| 1 <- recommended | Full year 2026 | Jan 1 - Dec 31, 2026 |
| 2 | YTD 2026 (Jan - May) | Jan 1 - May 31, 2026 |
| 3 | Q2 2026 (Apr - Jun, in progress) | Apr 1 - Jun 30, 2026 |
| 4 | Full year 2025 | Jan 1 - Dec 31, 2025 |
| 5 | Custom range -- I'll specify start / end month | -- |

Adapt `<- recommended` and visible options to context: YTD if the user said
"latest"; full year if they said "2026 actuals"; prior year if they said "2025".
Always compute the current quarter's label dynamically from today's date -- do
not hardcode Q2.

If the prompt already specified a period (e.g. "Q1 2026", "full year 2025"),
store it directly and skip the period question.

Store `<PERIOD_START>` (first day, `YYYY-MM-DD`) and `<PERIOD_END>` (last day).

Match strategy (Layouts A-D only): `name first then GL code` (default) vs `GL code only`. Omit for Layout E (no existing-sheet matching needed -- Layout E always writes a new tab).

Store `<ENTITY_NAME>`, `<PERIOD_START>`, `<PERIOD_END>`, `<MATCH_STRATEGY>` (Layouts A-D).

### Gate 3a -- Aggregation level (Layout E only)

Skip this sub-gate for Layouts A-D -- aggregation is always monthly there. Set `<AGGREGATION> = MONTH` and continue.

For Layout E, this MUST be a separate `ask the user` call -- do not bundle with the period question above, and do not infer the answer from the period range. A YTD period (e.g. Jan-May) does not mean "Quarter"; a full-year period does not mean "Year". The user picks the period independently from the aggregation.

> Aggregate tag columns by:

| # | Label |
|---|---|
| 1 <- recommended | Year -- one period block per year |
| 2 | Quarter -- one block per quarter |
| 3 | Month -- one block per month |

Store `<AGGREGATION>` (`YEAR` | `QUARTER` | `MONTH`).

Hard rule: if you find yourself building a tag-view with multiple period blocks (e.g. Q1+Q2) without an `ask the user` whose answer literally selected one of the three options above, you skipped this gate. Stop and ask before proceeding to Gate 4.

---

## Gate 4 -- Read the existing budget

If `<RUNTIME>` is `excel-addin`:

Use the Excel add-in's runtime read tools to inspect the budget tab --
header row, line-item rows, actuals/budget columns, formula rows.

If `<RUNTIME>` is `local-file`:

```bash
uv run "${CLAUDE_PLUGIN_ROOT}/scripts/read_workbook.py" \
  "<DESTINATION_PATH>" --sheet "<BUDGET_SHEET>"
```

Parse the resulting JSON to identify the same structure (headers,
line items, formula rows). Treat any cell where `is_formula: true` as
load-bearing -- never overwrite it.

---

## Gate 5 -- Load actuals

Layout E: use the category-grouped query from
[`references/tag-view.md`](references/tag-view.md) §SQL. Pick the JSON path
when Gate 2.5 detected `REPORTING_TAGS_JSON` rows; the flat path when only
`REPORTING_TAGS` was populated. Substitute `<period_trunc>` from `<AGGREGATION>`,
`<period_start>` from `<PERIOD_START>`, `<period_end>` from `<PERIOD_END>`, and
`<entity_name>` from `<ENTITY_NAME>`. The JSON path discovers `<CATEGORIES>`
inside the query via `LATERAL FLATTEN` -- do not parameterize the category list
into the SQL. All other rules below apply unchanged.

Layouts A-D: always call through [`references/get-actuals.md`](references/get-actuals.md).
Never write inline SQL outside that file.

---

## Gate 6 -- Pre-build review (approval gate)

Preview table grouped by:

- Existing rows updated -- Line Item | Old Value | New Value | Source.
- Cells zeroed -- Line Item | Old Value | Reason ("no activity in period").
- New rows to insert -- Account | Section | Position | Value | Source.
- GL accounts found in DWH with no row in the sheet -- Account | Total in period.

If any rows carry the `low-confidence -- sparse history` flag (account
has < 6 months of activity in the lookback window), surface the count
above the table.

Output the preview tables above as a normal conversation message. Then call `ask the user` immediately after -- the `question` field must be a single short sentence; never include preview content inside it.

- `question`: `"Approve applying these updates?"`
- `header`: `"Approval"`
- `multiSelect`: `false`
- `options`:
  1. Approve and apply the updates <- recommended (`description`: `"Writes the actuals to the destination chosen in Gate 1."`)
  2. Edit -- change the period range, match strategy, or scope
  3. Cancel

The `<- recommended` marker goes inside the `description` field of option 1, not as a suffix on the `label`.

Wait for explicit OK before writing.

Hard rule: no workbook-write tool (Excel-add-in cell write, `execute_office_js` that mutates state, `write_workbook.py`, or any equivalent) runs before this gate's `ask the user` returns the user's explicit "Approve and write" choice. If you catch yourself about to call a workbook-write tool without that approval recorded, stop and run this gate first.

---

## Gate 7 -- Write the changes (preserving formulas) AND brand the tabs

### Approval-recorded check (run FIRST, before any write tool)

Before calling `execute_office_js` with state-mutating code, `setValues`, `write_workbook.py`, or any other workbook-write tool, look back at your tool history. Find the most recent `ask the user` you sent. Does its answer literally include `"Approve and apply the updates"`? If NO, Gate 6 did not pass -- send the Gate 6 approval menu now and wait for the explicit answer.

Do not interpret upstream answers as approval. A Gate 2 layout response, a Gate 3 period-range answer, or any prior `ask the user` whose answer is not literally `"Approve and apply the updates"` does NOT clear this gate.

### Gate 7 requires AT LEAST three separate `execute_office_js` calls (excel-addin runtime)

The most common failure mode is bundling cell writes + formatting + logo + verification into one `writeSheet(...)` function -- the model writes the cells, returns, hardcodes the logo height, and the user gets a misaligned logo they have to resize manually. Do not combine the cell-write call with the brand block in a single office.js block.

- Call 1: apply the cell updates from the approved payload. One `execute_office_js`. Return.
- Call 2 (per tab touched): logo via the verbatim brand block (paste from below -- DO NOT paraphrase, DO NOT hardcode the height, DO NOT anchor to a single cell).
- Final call (combined verification): currency format + shape geometry on every tab touched in one `execute_office_js`. See the combined verification block below.

Returning from Call 1 does NOT finish Gate 7. The final combined verification call must appear in your tool history before Gate 8 summary.

### Verbatim brand block -- paste this, do not improvise

The single most common logo regression is hardcoding `shape.height = 48` (or any other pixel value) instead of using the actual E1:E3 row-band height. Excel's row heights depend on font sizes set during Call 1, so the band height can vary tab-to-tab. The model that hardcodes 48 produces a logo that either spills past row 3 or sits inside row 1 -- the user then has to resize manually. Paste this block verbatim per tab; substitute only `<TAB_NAME>`:

```javascript
const base64 = blobs.getText("assets/powered_by_carta.b64.txt").trim();

const sheet = context.workbook.worksheets.getItem("<TAB_NAME>");
const shapes = sheet.shapes;
shapes.load("items/name");
await context.sync();

// De-dup: remove any prior CartaLogo so re-runs don't stack shapes.
for (const s of shapes.items) {
  if (s.name === "CartaLogo") s.delete();
}
await context.sync();

// Anchor to the FULL row band E1:E3 -- never a single cell.
const rows = sheet.getRange("E1:E3");
rows.load(["left", "top", "height"]);
await context.sync();

const image = sheet.shapes.addImage(base64);
image.name = "CartaLogo";

image.load(["width", "height"]);
await context.sync();
const ratio = image.width / image.height;

image.lockAspectRatio = false;
image.height = rows.height;        // <- match actual row-band height, never a pixel literal
image.width  = rows.height * ratio;
image.left   = rows.left;
image.top    = rows.top;
image.lockAspectRatio = true;
await context.sync();
```

Forbidden patterns (these reproduce the manual-resize bug):

- `image.height = 48` (or any number literal) -- height MUST come from `rows.height`.
- `sheet.getRange("E1")` instead of `sheet.getRange("E1:E3")` -- single-cell anchor loses the band height.
- Skipping the de-dup loop -- re-runs stack a second `CartaLogo` shape on top of the first.
- Skipping `image.lockAspectRatio = false` before sizing -- Excel resists width changes if locked.

Only touch the cells the user approved. Do not edit formulas elsewhere
in the sheet (subtotals are formula-driven and will auto-update).

Before any write, call both of these in the same message (parallel reads):

1. `read_skill(file_path="references/branding-and-header.md")` -- 4-row metadata band, logo placement, `blobs.getText` asset pattern, cell-comment API.
2. `read_skill(file_path="references/<layout-from-gate-2>.md")` -- the layout file chosen in Gate 2 (e.g. `add-actuals-columns.md` for Layout A).

Do not reconstruct either spec from memory. Both files must be in your context before generating any `execute_office_js` or `write_workbook.py` code. The `branding-and-header.md` file defines:

- The reserved 4-row metadata band (A1-A4 + blank A5) that every tab must carry -- per-skill override (this skill uses column A so the band left-edges with the account-label column underneath). If the existing budget tab doesn't have it, add it as part of this write (shift the data down to row 6+ first via `sheet.getRange("1:5").insert(...)` in Excel add-in mode, or via prepended row writes in local-file mode).
- The Carta logo placement (column E, rows 1-3 height) -- apply to every tab this skill touches, including the actuals tab(s) it adds.
- The blobs.getText asset-loading pattern for Excel add-in mode (NOT `Read`).
- The cell-comment pattern for any sparse-history / low-confidence flag.

If `<RUNTIME>` is `excel-addin`:

- Layouts A-D: load `references/add-actuals-columns.md` §5 ("Build the rebuild payload") and apply its header / column / format spec verbatim -- especially the two-row header (row N = merged month labels, row N+1 = `Budget` / `Actual` / `Variance` sub-headers -- spelled out in full, never abbreviated). Then use the add-in's cell-write tools to execute the payload.
- Layout E: load [`references/tag-view.md`](references/tag-view.md) §"Writing the workbook (excel-addin runtime)" and follow it verbatim -- 3-row period/category/tag header, `range.merge(true)` for period and category bands. Do NOT freeze panes -- same rule as Layouts A-D and the rest of the Carta budgeting skills.

If `<RUNTIME>` is `local-file`: build an operations payload and apply it:

```bash
uv run "${CLAUDE_PLUGIN_ROOT}/scripts/write_workbook.py" --stdin <<'JSON'
{
  "workbook_path": "<DESTINATION_PATH>",
  "operations": [ ... ]
}
JSON
```

- Layouts A-D: use only `write_cell` / `write_formula` / `set_format` operations. Avoid `create_sheet` and `write_range` here -- those are for `carta-create-budget`.
- Layout E: use `create_sheet`, `write_cell`, `write_range`, `merge_cells`, `set_bold`, `set_format`, `set_column_width` (Account col), `autofit_columns` (data cols) per [`references/tag-view.md`](references/tag-view.md) §"Writing the workbook (local-file runtime)". Always issue `write_cell` for a period label before the `merge_cells` op for that same range. Do NOT include `freeze_panes` -- same rule as Layouts A-D and the rest of the Carta budgeting skills.

### Combined currency + branding verification (REQUIRED, observable, excel-addin only)

After the brand block runs for every tab, execute one `execute_office_js` that checks both currency format and logo geometry in a single `context.sync()`. This replaces the two separate passes (currency readback -> branding check) previously required.

Two regressions this catches:
- Currency symbol -- a bare `$` renders as the user's Excel-locale symbol (`R$` on pt-BR, `£` on en-GB, `¥` on ja-JP). The locale token `<CCY_TOKEN>` for the resolved presentation currency locks display to that currency. `<CCY_TOKEN>` is `[$$-en-US]` (USD), `[$€-x-euro2]` (EUR), `[$£-en-GB]` (GBP), `[$$-en-CA]` (CAD), or the matching `[$<symbol>-<locale>]` -- resolved from the data, never defaulted to USD.
- Logo sizing -- hardcoded `shape.height = 48` misaligns the logo when the E1:E3 row band is taller or shorter than 48pt. Height must come from `rows.height`.

This block is NOT paste-verbatim -- substitute its placeholders before running: the `tabs` array (the tab names touched this run), `<sample_amount_cell>`, and `<CCY_TOKEN>` (replace with the resolved currency's locale token, e.g. `[$$-en-US]` / `[$€-x-euro2]`). If `<CCY_TOKEN>` is left literal, the `.includes(...)` check always returns `false` and Gate 7 loops forever.

```javascript
const tabs = [/* "Budget 2026", "2026 Actuals", ... -- substitute the actual tab names touched this run */];
const result = {};
for (const tabName of tabs) {
  const sheet = context.workbook.worksheets.getItem(tabName);
  sheet.shapes.load("items/name,items/height,items/left,items/top");
  const rows = sheet.getRange("E1:E3");
  rows.load(["height", "left"]);
  // Pick one amount cell -- typically C7 (Layout E) or B8 (Layouts A-D). Substitute from your payload.
  const cell = sheet.getRange("<sample_amount_cell>");
  cell.load("numberFormat");
  await context.sync();

  const logo = sheet.shapes.items.find(s => s.name === "CartaLogo");
  result[tabName] = {
    // Currency check
    numberFormat:      cell.numberFormat[0][0],
    currencyOk:        cell.numberFormat[0][0].includes("<CCY_TOKEN>"),  // resolved-currency locale token, not always USD
    // Branding checks
    found:             !!logo,
    shapeHeight:       logo ? logo.height : null,
    rowBandHeight:     rows.height,
    heightMatchesBand: logo ? Math.abs(logo.height - rows.height) < 2 : false,
    shapeLeft:         logo ? logo.left : null,
    rowBandLeft:       rows.left,
    leftMatchesBand:   logo ? Math.abs(logo.left - rows.left) < 2 : false,
  };
}
return result;
```

Per-tab pass criteria -- ALL must be true:

- `currencyOk === true` -- sample cell format contains `<CCY_TOKEN>` (the resolved-currency locale token)
- `found === true` -- `CartaLogo` shape exists
- `heightMatchesBand === true` -- logo height equals E1:E3 row-band height ±2pt
- `leftMatchesBand === true` -- logo anchors at column E's left edge ±2pt

Recovery actions:

- `currencyOk: false` -> re-apply format with the resolved-currency token: `sheet.getRange("<full_amount_range>").numberFormat = [["_(<CCY_TOKEN>* #,##0.00_);_(<CCY_TOKEN>* (#,##0.00);_(<CCY_TOKEN>* \"-\"??_);_(@_)"]]`, then re-run this combined verification.
- `found: false` -> brand block was skipped -- re-run the verbatim brand block, then re-verify.
- `heightMatchesBand: false` or `leftMatchesBand: false` -> brand block used a hardcoded pixel or wrong anchor -- delete the `CartaLogo` shape and re-run the verbatim brand block, then re-verify.

Do not start Gate 8 summary text until every tab passes all four criteria. The verification call is observable evidence; without it in your tool history with passing checks, Gate 7 is not complete.

---

## Gate 8 -- Summary + next steps

Gate 8 precondition (DO NOT SKIP). Before sending the summary text below, scan your tool history. Three anchors MUST be present in this order (excel-addin runtime):

1. An `ask the user` whose answer included `"Approve and apply the updates"` -- Gate 6 approval.
2. A `sheet.shapes.addImage(base64)` call for each tab the skill touched (one per tab) -- Gate 7 branding.
3. The combined currency + branding verification `execute_office_js` whose result showed `currencyOk: true`, `found: true`, `heightMatchesBand: true`, and `leftMatchesBand: true` for every tab -- Gate 7 combined verification.

If any anchor is missing, you have skipped a gate. Do NOT write "Carta logo placed at..." in the summary when no `shapes.addImage` call appears in your tool history -- that's hallucinating completion. STOP, go back, run the missing gate, then return here.

Layouts A-D -- If `<RUNTIME>` is `excel-addin`:

> Refreshed 23 lines on [Budget 2026](<citation:Budget 2026!A1:Z80>)
> (Example MgmtCo). 2 lines zeroed (Audit, Tax Prep -- no Q1 activity).
> 1 new account inserted under Operating Expenses (AI Tooling).
> 2 suspicious-zero flags -- Salaries and Leased-employee payments
> dropped to $0; could be posting lag.

Layouts A-D -- If `<RUNTIME>` is `local-file`:

> Refreshed 23 lines on `Budget 2026` in
> `file:///path/to/<budget-workbook>.xlsx` (Example MgmtCo). 2 lines zeroed (Audit, Tax Prep -- no Q1 activity). 1 new
> account inserted (AI Tooling, Operating Expenses). 2 suspicious-zero
> flags -- Salaries and Leased-employee payments.

Layout E -- If `<RUNTIME>` is `excel-addin`:

> Created [2026 Actuals by Department](<citation:2026 Actuals by Department!A1>) (Example MgmtCo) -- 23 accounts × 4 department values (Engineering, Marketing, G&A, Untagged), annual aggregation. 1 account flagged low-confidence (sparse history). Carta logo placed at E1.
>
> Substitute the period block phrasing to match `<AGGREGATION>` from Gate 3a: "annual aggregation" for `YEAR`, "across 4 quarters" / "across Q1+Q2" for `QUARTER`, "across 12 months" / "across Jan-May" for `MONTH`.

Layout E -- If `<RUNTIME>` is `local-file`:

> Created `2026 Actuals by Department` tab in `file:///path/to/<budget-workbook>.xlsx` (Example MgmtCo) -- 23 accounts × 4 department values, annual aggregation. 1 account flagged low-confidence (sparse history). Adjust the period phrasing to match `<AGGREGATION>` (see excel-addin example above).

The next-step menu MUST be a single `ask the user` call with the options below as `options` entries. Never render them as a numbered markdown list, a bulleted list, or inline prose -- bare-text menus break the chooser UI in Claude for Excel and force the user to type the number. The `<- recommended` marker goes inside the `description` field of one option, not as a suffix on the `label`.

1. Run a pacing analysis (Budget vs Actuals) <- recommended
2. Drill into a specific line item (largest entries / month-by-month)
3. Model a what-if scenario on this budget
4. I'm done

Call `ask the user` with these exact parameters:

- `question`: `"What would you like to do next?"`
- `header`: `"Next step"`
- `multiSelect`: `false`
- `options`: the four `label` + `description` pairs above (place `<- recommended` in the `description` field of the recommended option, NOT in the `label`)

Do not bury the menu as closing prose. In Cline, ask clearly in chat or use the host question UI when available before continuing.

Mark `<- recommended` based on context -- option 1 by default after a refresh; option 2 if the user previously asked about a specific line.

When the user selects an option, load the corresponding bundled Cline skill before doing any work. Do not freelance the output -- apply the downstream skill's gates, layout spec, branding rules, and approval flow. Routing:

| Option | Skill to invoke |
|---|---|
| 1 -- Run a pacing analysis | `carta-budget-vs-actuals` |
| 2 -- Drill into a specific line item | `carta-budget-vs-actuals` with the `drill-down-line` reference |
| 3 -- Model a what-if scenario | `carta-budget-scenarios` |
| 4 -- I'm done | No invocation; close cleanly |

---

### DWH result formatting

Queries > 50 rows: request `format: "ndjson"`, bucket into a blob. Don't paste large results -- triggers `context_snip`. Use `"markdown"` only for <=50-row previews.

## Hard rules

- Same DWH primitives as `carta-create-budget` -- Carta DWH journal-entries table only, no external-DWH fallback, `FUND_NAME` scoping, `AMOUNT` (not the base-currency variant), sign flip, preserve reversals.
- Local-file: never overwrite cells flagged as formulas in `read_workbook.py` output. Subtotals / NOI keep their `=SUM(...)` semantics.
- Two-row header is mandatory for month-bucketed tables. Row N = merged month label per `Budget`/`Actual`/`Variance` triplet. Row N+1 = sub-headers spelled out in full (`Budget`, `Actual`, `Variance`). Never abbreviate to `B`/`A`/`V`. Never write both into the same row -- subsequent merges destroy sub-headers.
- `range.merge(true)` discards trailing cell values. Insert a new row first.
- Month-label date-serial trap: prefix with `'` or use `numberFormat: "mmm yyyy"` on a real date.
- Currency -- derive from the data, never default to USD. Resolve the workbook's presentation currency before writing (entity properties via `welcome`, or the currency on the budget data); if it can't be resolved, ask the user. The format uses the locale token `<CCY_TOKEN>` for the resolved currency -- `[$$-en-US]` USD, `[$€-x-euro2]` EUR, `[$£-en-GB]` GBP, `[$$-en-CA]` CAD, or the matching `[$<symbol>-<locale>]`. The `B4`/`A4` band reads `Amounts in <resolved_currency>`.
- Currency format: `_(<CCY_TOKEN>* #,##0.00_);_(<CCY_TOKEN>* (#,##0.00);_(<CCY_TOKEN>* "-"??_);_(@_)`. Apply to data range after the data write.
- Match the existing tab's period granularity. If the budget tab is quarterly (not monthly), interleave Budget/Actual/Variance per quarter, not per month. For a partial period (e.g. YTD through a mid-quarter month against a quarterly tab), pull actuals at month grain and aggregate to the tab's buckets. Do not prorate a quarter's budget by month-fraction to approximate a partial period -- derive the period's budget from the underlying monthly source.
- Buffer-aware variance basis. If the on-tab budget carries an inflation/contingency buffer (an input cell, or a header note like "Budget includes X% buffer"), variances are computed against the buffered figure -- state this in the preview so favorable variances aren't misread, and offer to compare against the raw (pre-buffer) budget instead.
- Border syntax (Office.js): `style = "Continuous"`, then `weight = "Thin"`. Never `style: "Thin"`.
- Recalc + column widths: the last statements in the cell-write `execute_office_js` block (Call 1), in this order -- never a separate call: restore automatic calc -> `context.workbook.application.calculate(Excel.CalculationType.full)` -> `sheet.getRange("A:AN").format.autofitColumns()` (widen the range to the last amount column) -> `context.sync()`. Recalc before autofit: without the forced recalc the `=SUM(...)` / variance / NOI cells stay at 0 and the accounting format shows `-` (forcing the user to edit+Enter each one); autofitting before the recalc sizes the amount columns to the dash so real figures overflow as `####`. Never autofit a header-only range.
- Branding standards -- follow [`references/branding-and-header.md`](references/branding-and-header.md) for every tab. Per-skill overrides: metadata band in column A (not B), logo at column E. Asset access via `blobs.getText("assets/...")`.

---

## Schema discovery

The skill queries the Carta DWH journal-entries table. If column
names are needed, look up the table via the Carta MCP DWH schema
command once at Gate 0 -- production schema is canonical. Don't embed
column listings inline; the DWH contract can drift.

## Error handling

| Symptom | Likely cause | What to tell the user |
|---|---|---|
| No Carta MCP server found | The Carta connector isn't enabled in this session | "I can't see your Carta connector. Open Settings -> Connectors in Claude, enable Carta, then ask me again." |
| Sheet has no recognisable header row | The budget layout uses non-date column headers | Surface what the headers look like and ask the user which row is the header and which columns are actuals. |
| `low-confidence -- sparse history` flagged on many rows | Entity is new or sparsely posted | Surface the count in the preview and let the user decide whether to proceed. Don't auto-suppress. |
| Multiple budget tabs in the workbook | Ambiguous "the budget" | Ask the user which tab to update; do not silently pick one. |
| Cell the skill wants to write is a formula | Subtotal / NOI row | Surface the row and confirm; never silently overwrite a formula. |
| Local-file mode: file path is missing or unreadable | Wrong path supplied | Echo the path back and ask for the correct one. |
| Query times out | DWH load | Tell the user it's slow and offer to retry -- never auto-retry. |
| Auth / permission error from the MCP | Carta session expired or lacks DWH access | Ask the user to reconnect Carta in Settings -> Connectors. |
| Carta MCP tool calls fail with `McpAuthError` or "tool not available" | Carta authorization or the plugin-owned MCP connection is unavailable. | Tell the user Carta authorization or the plugin-owned MCP connection is required. |

Connector troubleshooting (operator-facing, not user-facing). Use the plugin-owned `carta` server in Cline. Do not probe alternate prefixes; if Carta tools are unavailable, ask the user to authorize or reconnect Carta.

Never auto-retry a failed query.
