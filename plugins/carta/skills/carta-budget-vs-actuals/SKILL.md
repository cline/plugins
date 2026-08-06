---
name: carta-budget-vs-actuals
model: opus
description: 'Analyze pacing and variance: compare YTD actuals against a budget workbook (read-only analysis, pulls actuals from Carta MCP). TRIGGER: "how are we doing", pacing, on-track, variance analysis, compare budget vs actuals. NOT: writing/refreshing actuals columns into the workbook (carta-budget-actuals), new budgets (carta-create-budget), fetch-budget, scenarios, consolidating P&L / balance sheet.'
version: 1.0.1
---

## Cline Compatibility

Use the plugin-owned `carta` MCP server in Cline and default to local-file workflow. Ignore later source-host instructions that say to call `refresh_mcp_connectors`, choose a Claude for Excel runtime, use `execute_office_js`, probe duplicate `mcp__<SERVER>__...` prefixes, or write into host-specific preview state. Set `<SERVER>` to `carta` when a source example uses that placeholder. Use the available `mcp__carta__...` tools or the equivalent Carta tool exposed by the MCP server. When examples use `${CLAUDE_PLUGIN_ROOT}/scripts/...`, resolve the helper from `../../scripts/...` relative to this skill directory. When examples use `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/assets/...`, resolve the asset from this skill directory. Do not create, overwrite, or mutate a workbook until the user explicitly approves the destination and exact write.

[PATTERN carta-writing-style v0.0.2]
[PATTERN etiquette v0.0.6]
[PATTERN text v0.0.8]
[PATTERN tables v0.0.12]
[PATTERN carta-watermark v0.0.10]
[PATTERN base v0.1.0]

# Budget vs actuals

Pacing and variance analysis on top of an existing budget. Two
references:

- [`references/pacing-overview.md`](references/pacing-overview.md) -- sheet-wide pacing & variance.
- [`references/drill-down-line.md`](references/drill-down-line.md) -- month-by-month + top journal entries for one line.

## UX Rules

Audience is an accountant in Excel. Plain English only. Never surface MCP
identifiers, DWH column names, UUIDs, raw JSON, SQL, or step labels.
Currency: `<CCY>X,XXX` positive, `(<CCY>X,XXX)` negative, totals bolded -- use the resolved currency symbol, never a bare `$`.
Differences are absolute. Status: ✅ Match | ⚠ Mismatch ($X diff) | ❌ Missing in Carta | ❌ Missing in Client Doc.

Closing summary link is a workbook citation (`<citation:Sheet!Range>`) in
Claude for Excel mode, and a `file://` path in Cline local-file mode.
Chat-only mode produces neither -- just the analysis.

Every numbered choice in this skill -- including the closing
next-step menu -- must be presented as an explicit user choice. In Cline,
ask in chat or use the host question UI when available. Do not bury
choices in closing prose.

## When to use

- "Compare YTD to budget"
- "How are we pacing this year?"
- "Are we on track?"
- "What's our variance?"
- "Why are we over on Travel?"
- "Drill into Legal Fees"
- "Which months had the biggest spend on X?"

## DO NOT use this skill for

- Building a new budget -- use `carta-create-budget`.
- Refreshing actuals on an existing budget -- use `carta-budget-actuals`.
- What-if scenarios ("what if we cut headcount", "model a revenue shock", "preserve $X cash") -- use `carta-budget-scenarios`.
- P&L / income statement requests -- use `carta-consolidating-pnl`.

---

## Execution discipline

Execute all steps silently. Do not narrate tool calls, intermediate results, or status updates. Only speak at explicit decision points: Step 0.5 (if runtime is ambiguous), Step 1 (destination chooser), Step 2 (intent routing), Step 3 (period/parameter gate), Step 6 (approval), and Step 8 (next-step menu).

---

## Entry mode -- fresh session vs. chained skill

Before Step 0, check whether these context variables are already set from an earlier budgeting skill call in the same session:

- `<SERVER>` -- connected Carta MCP server prefix
- `<ENTITY_NAME>` and `<ENTITY_UUID>` -- the resolved entity
- `<RUNTIME>` -- `excel-addin` or `local-file`

If all four are in context: skip Steps 0 and 0.5 entirely. Proceed from Step 1 (destination chooser).

If any is missing (fresh session or cold invocation): run Steps 0 and 0.5 in order, then continue from Step 1.

Do not ask "which firm?" or "which runtime?" when those are already established from the skill the user just ran.

---

## Step 0 -- Carta MCP environment + resolve firm

In Cline, set `<SERVER>` to `carta` and use the plugin-owned Carta MCP server. If `mcp__carta__welcome` or an equivalent Carta welcome tool is exposed, call it first. Do not call `refresh_mcp_connectors` or probe alternate server prefixes in Cline.

If the Carta MCP tools are unavailable, tell the user that Carta authorization or the plugin-owned MCP connection is required and stop. If the source text below references multiple connected Carta prefixes, ignore that host-specific path and keep `<SERVER>` as `carta`.

Resolve firm: if user named one -> `call_tool({"name": "contexts__list", "arguments": {"firm_name": "<entity>"}})` -> disambiguate via `ask the user` if multiple -> `set_context(firm_id=<uuid>)`. Granular tools preferred when exposed.

DWH param-name traps: `dwh:execute:query` takes `sql:` not `query:`. `dwh:get:table_schema` takes `table_name:` not `table:`. `format` accepts `"ndjson"` / `"markdown"`, not `"csv"`.

If no firm was named, defer to Step 1.

## Step 0.5 -- Detect runtime

In Cline, set `<RUNTIME>` to `local-file` and ask for a user-supplied `.xlsx` path or a user-approved new workbook path when needed.

## Step 1 -- Where to write the analysis

Branches by `<RUNTIME>`.

If `<RUNTIME>` is `excel-addin`:

Empty-workbook shortcut: if the active workbook has one sheet, `maxRows == 0`, no other tabs (typically a fresh `Book1.xlsx`/`Sheet1`), skip the chooser. Announce the rename in one sentence -- *"I'll use the empty workbook you have open and rename `Sheet1` to `Budget vs Actuals`."* -- then proceed. (Skip this shortcut if the user asked for chat-only output.) The chooser only exists to protect non-empty state.

> Where should I write the analysis?

- "Update the open workbook -- new tab `Budget vs Actuals`" (recommended).
- "Update the open workbook -- alongside the existing budget tab" (adds columns).
- "Just summarize in chat -- don't write to the sheet".

If `<RUNTIME>` is `local-file`:

> Where should the analysis go?

- "Add a `Budget vs Actuals` sheet to the same file" (recommended).
- "Write a separate `<budget>-vs-actuals.xlsx` file alongside the original".
- "Just summarize in chat -- don't write anything".

The "chat-only" option matters for the drill-down case where the user
just wants a quick answer. In chat-only mode, skip the read-helper step
in `local-file` mode if no file is open.

## Step 2 -- Intent routing

Call `read_skill` for the matched reference immediately -- do not reconstruct the analysis spec from memory:

| Phrase | Call |
|---|---|
| "compare", "pacing", "on track", "variance", "how are we doing" | `read_skill(file_path="references/pacing-overview.md")` |
| "why are we over on <X>", "drill into <X>", "what drove <X>", "largest entries", "which months", "what's behind" | `read_skill(file_path="references/drill-down-line.md")` |

## Step 3 -- Read the budget from the workbook

If `<RUNTIME>` is `excel-addin`: use the add-in's read tools.

If `<RUNTIME>` is `local-file`:

```bash
uv run "${CLAUDE_PLUGIN_ROOT}/scripts/read_workbook.py" \
  "<BUDGET_PATH>" --sheet "<BUDGET_SHEET>"
```

In both modes:

- Identify the budget tab (ask if ambiguous).
- Parse line items, sections, and the budget column(s) -- both monthly and annual.
- Identify any existing YTD column so the analysis can fill it rather than duplicate.

## Step 4 -- Pull YTD actuals

Use [`references/get-actuals.md`](references/get-actuals.md)
as the canonical source. `<period_start>` = first day of budget year,
`<period_end>` = today (or last completed month -- ask).

## Step 5 -- Compute pacing metrics

For each line:

- `actual_ytd` = sum of monthly actuals to date.
- `budget_ytd` = sum of monthly budget through same period.
- `% of annual consumed` = `actual_ytd / annual_budget`.
- `% of year elapsed` = `months_elapsed / 12` -- single source of
  truth, used in both the SKILL.md and `pacing-overview.md`.
- `projected run-rate` = `actual_ytd / months_elapsed * 12`.
- `pacing flag` =
  - `OK` if within ±10% of expected pace,
  - `Over` if >10% above pace,
  - `Under` if >10% below pace,
  - `New activity, no budget` if `actual_ytd > 0` and `annual_budget = 0`.

## Step 6 -- Pre-build review (approval gate, only if writing cells)

Render two preview tables -- overview (<=6 cols) and pacing detail. Splitting keeps each table scannable; squeezing 9 columns into one breaks the chooser UI in Claude for Excel.

Overview:

| Section | Line Item | Annual Budget | YTD Actual | % Consumed | Flag |
|---|---|---|---|---|---|

Pacing detail (one row per flagged line -- drop the OK rows):

| Line Item | YTD Budget | Variance | Run-Rate | Projected Year-End |
|---|---|---|---|---|

Output the preview tables above as a normal conversation message. Then call `ask the user` immediately after -- the `question` field must be a single short sentence; never include preview content inside it.

- `question`: `"Approve writing this analysis?"`
- `header`: `"Approval"`
- `multiSelect`: `false`
- `options`:
  1. Approve and write the analysis <- recommended (`description`: `"Writes the pacing analysis to a new tab."`)
  2. Edit -- change the period end, scope, or threshold
  3. Cancel

The `<- recommended` marker goes inside the `description` field of option 1, not as a suffix on the `label`.

Wait for OK before writing. Skipped entirely in chat-only mode.

Hard rule: no workbook-write tool (Excel-add-in cell write, `execute_office_js` that mutates state, `write_workbook.py`, or any equivalent) runs before this gate's `ask the user` returns the user's explicit "Approve and write" choice. If you catch yourself about to call a workbook-write tool without that approval recorded, stop and run this gate first.

## Step 7 -- Write and brand the tabs (skipped in chat-only mode)

### Approval-recorded check (run FIRST, before any write tool)

Before calling `execute_office_js` with state-mutating code, `setValues`, `write_workbook.py`, or any other workbook-write tool, look back at your tool history. Find the most recent `ask the user` you sent. Does its answer literally include `"Approve and write the analysis"`? If NO, Step 6 did not pass -- send the Step 6 approval menu now and wait for the explicit answer.

Do not interpret upstream answers as approval. A period-end answer from Step 1, a destination answer, or any prior `ask the user` whose answer is not literally `"Approve and write the analysis"` does NOT clear this gate.

### Step 7 requires AT LEAST three separate `execute_office_js` calls (excel-addin runtime)

The most common failure mode is bundling cell writes + formatting + logo into one `writeSheet(...)` function -- the model writes the cells, returns, and forgets the logo. Do not combine the cell-write call with the brand block in a single office.js block.

- Call 1: cell values, formulas, formatting, conditional formats. One `execute_office_js`. Return.
- Call 2 (per tab touched): logo via the verbatim brand block from `branding-and-header.md` (`sheet.shapes.addImage(...)`).
- Call N (verification, LAST): load shape names on every tab touched, confirm `CartaLogo` exists.

Returning from Call 1 does NOT finish Step 7. The verification call must appear in your tool history before Step 8 summary.

Before any write, call both of these in the same message (parallel reads):

1. `read_skill(file_path="references/branding-and-header.md")` -- 4-row metadata band, logo placement, `blobs.getText` asset pattern, cell-comment API.
2. `read_skill(file_path="references/<reference-from-step-2>.md")` -- the analysis file matched in Step 2 (`pacing-overview.md` or `drill-down-line.md`).

Do not reconstruct either spec from memory. Both files must be in your context before generating any `execute_office_js` or `write_workbook.py` code. The `branding-and-header.md` file defines the reserved 4-row metadata band (A1 firm / A2 descriptive title like `"Q1 2026 Budget vs Actuals (YTD through March)"` / A3 source / A4 other context), the Carta logo placement (column E, rows 1-3 height), the `blobs.getText("assets/...")` asset-loading pattern for Excel add-in (NOT `Read`), and the cell-comment pattern for any "pacing off plan" flag.

If `<RUNTIME>` is `excel-addin`: use the add-in's cell-write tools, then brand the new `Budget vs Actuals` tab (and the underlying Budget tab if a header band was inserted into it).

If `<RUNTIME>` is `local-file`:

```bash
uv run "${CLAUDE_PLUGIN_ROOT}/scripts/write_workbook.py" --stdin <<'JSON'
{
  "workbook_path": "<DESTINATION>",
  "operations": [ ... ]
}
JSON
```

Include `add_image` (one per new tab) and `set_comment` (one per pacing-flagged row) ops in the same payload as the cell writes.

All numerical columns should be live formulas where possible (so the
user can rerun by editing source data).

### Branding verification (REQUIRED, observable, excel-addin only)

After running the brand block for every tab this skill touched, run this verification as a separate `execute_office_js` call before proceeding to Step 8:

```javascript
const tabs = [/* "Budget vs Actuals", ... -- substitute the actual tab names touched this run */];
const result = {};
for (const tabName of tabs) {
  const sheet = context.workbook.worksheets.getItem(tabName);
  sheet.shapes.load("items/name");
  await context.sync();
  result[tabName] = sheet.shapes.items.map(s => s.name);
}
return result;
```

The result must show `CartaLogo` in every tab's shape list. If any tab returns `[]` or lacks `CartaLogo`, re-run the brand block for that tab and re-verify. Do not start Step 8 summary text until this verification returns `CartaLogo` on every tab.

## Step 8 -- Summary + next steps

Step 8 precondition (DO NOT SKIP, non-chat-only modes). Before sending the summary text below, scan your tool history. Three anchors MUST be present in that order:

1. An `ask the user` whose answer included `"Approve and write the analysis"` -- Step 6 approval.
2. A `sheet.shapes.addImage(base64)` call for each tab the skill touched -- Step 7 branding.
3. The branding-verification `execute_office_js` whose result showed `CartaLogo` on every tab -- Step 7 verification.

If any anchor is missing in a write mode (not chat-only), you have skipped a gate. Do NOT write "Carta logo placed at..." in the summary when no `shapes.addImage` call appears in your tool history. STOP, go back, run the missing gate, then return here. (Chat-only mode skips all three -- the summary IS the deliverable.)

If `<RUNTIME>` is `excel-addin`:

> Pacing summary: 12 lines on plan, 3 over (Travel +28%, Legal +14%,
> AI Tooling new activity not budgeted), 2 under (Audit -22% -- Q4-loaded,
> expected; Tax Prep -18%). Run-rate forecast lands <CCY>42,000 over annual
> operating budget. Full table on [Budget vs Actuals](<citation:Budget vs Actuals!A1:M40>).

If `<RUNTIME>` is `local-file`:

> Pacing summary: 12 lines on plan, 3 over, 2 under. Run-rate forecast
> lands <CCY>42,000 over annual operating budget. Full table written to
> `Budget vs Actuals` in
> `file:///path/to/<budget-workbook>.xlsx`.

If chat-only: the summary IS the deliverable -- render the full
pacing table inline. No file or citation.

The next-step menu MUST be a single `ask the user` call with the options below as `options` entries. Never render them as a numbered markdown list, a bulleted list, or inline prose -- bare-text menus break the chooser UI in Claude for Excel and force the user to type the number. The `<- recommended` marker goes inside the `description` field of one option, not as a suffix on the `label`.

1. Drill into a specific line item to understand the variance <- recommended
2. Model a what-if scenario (cost rebalance, headcount cut)
3. Refresh the underlying actuals first, then re-run
4. I'm done

Call `ask the user` with these exact parameters:

- `question`: `"What would you like to do next?"`
- `header`: `"Next step"`
- `multiSelect`: `false`
- `options`: the four `label` + `description` pairs above (place `<- recommended` in the `description` field of the recommended option, NOT in the `label`)

Do not bury the menu as closing prose. In Cline, ask clearly in chat or use the host question UI when available before continuing.

Mark option 1 `<- recommended` when at least one line is flagged Over.
Mark option 2 `<- recommended` when the user's prompt mentions cash or
preserving spend. Mark option 3 if the latest actuals are clearly stale.

When the user selects an option, load the corresponding bundled Cline skill before doing any work. Do not freelance the output -- apply the downstream skill's gates, layout spec, branding rules, and approval flow. Routing:

| Option | Skill to invoke |
|---|---|
| 1 -- Drill into a specific line item | `carta-budget-vs-actuals` re-entry with the `drill-down-line` reference |
| 2 -- Model a what-if scenario | `carta-budget-scenarios` |
| 3 -- Refresh the underlying actuals | `carta-budget-actuals` |
| 4 -- I'm done | No invocation; close cleanly |

---

### DWH result formatting

Queries > 50 rows: request `format: "ndjson"` and bucket into a blob. Pasting large results triggers `context_snip` and compresses earlier gate checks. Use `"markdown"` only for <=50-row previews.

## Hard rules

- Reads from DWH; never writes to DWH. Spreadsheet writes go through the approval gate.
- Local-file mode: prefer adding a sheet to the same file over a separate file.
- Two-row header for month-bucketed tables. Row N = merged month label per Budget/Actual/Var triplet. Row N+1 = sub-headers. Never write both into the same row -- subsequent merges destroy sub-headers.
- `range.merge(true)` discards trailing cell values. Insert a new row first; don't merge over an existing sub-header row.
- Month-label date-serial trap. `"Jan 2026"` auto-coerces to a date serial -- prefix with `'` or write a real date with `numberFormat: "mmm yyyy"`.
- Currency -- derive from the data, never default to USD. Resolve the workbook's presentation currency before writing (entity properties via `welcome`, or the currency on the budget data); if it can't be resolved, ask the user. Format amounts with the locale token for the resolved currency -- `[$$-en-US]` USD, `[$€-x-euro2]` EUR, `[$£-en-GB]` GBP, `[$$-en-CA]` CAD, or the matching `[$<symbol>-<locale>]`. A bare `$` renders as the user's local symbol. The `B4`/`A4` band reads `Amounts in <resolved_currency>`.
- Buffer-aware variance basis. If the budget tab carries an inflation/contingency buffer (an input cell, or a header note like "Budget includes X% buffer"), pacing variances are measured against the buffered figure -- state this in the output so favorable variances aren't misread, and offer to pace against the raw (pre-buffer) budget instead.
- Recalc + column widths: the last statements in the cell-write `execute_office_js` block, in this order -- never a separate call: restore automatic calc -> `context.workbook.application.calculate(Excel.CalculationType.full)` -> set fixed widths on the text label columns -> autofit numeric columns only -> `context.sync()`. Pattern:
  ```javascript
  context.application.calculationMode = Excel.CalculationMode.automatic;
  context.workbook.application.calculate(Excel.CalculationType.full);
  sheet.getRange("A:A").format.columnWidth = 160;  // Section -- fixed, ~22 chars (points, not char-width); fits "Operating Expenses" without clipping
  sheet.getRange("B:B").format.columnWidth = 220;  // Line Item -- fixed, ~31 chars; fits long items like "Investment Management Fees"
  sheet.getRange("C:<last_col>").format.autofitColumns();  // numeric columns only
  await context.sync();
  ```
  Why fixed widths for label columns: calling `autofitColumns()` on the full range sizes column A to the widest section name (e.g. "Operating Expenses"), making it excessively wide and pushing numeric columns off screen. Always set A and B explicitly, autofit only C onwards. Recalc before autofit: without it variance / NOI cells stay at 0 and accounting format shows `-` (####  after autofit). Never autofit a header-only range.
- Border syntax (Office.js): `style = "Continuous"` then `weight = "Thin"`. Never `style: "Thin"`.
- Branding & header standards -- follow [`references/branding-and-header.md`](references/branding-and-header.md) for every tab. Rows 1-4 reserved for metadata band, Carta logo at column E (logo + band col-overrides documented in the reference). Asset access via `blobs.getText("assets/...")` -- NOT `Read`. Pacing-flagged rows use cell comments only.

---

## Schema discovery

Source: the Carta DWH journal-entries table. If column names are needed, look up the table via the Carta MCP DWH schema command once at Step 0.

## Error handling

Never auto-retry. Always surface the failure and let the user decide.

- No Carta MCP connected -> "Open Settings -> Connectors, enable Carta, retry."
- Multiple budget tabs -> ask which to analyze. Don't silently pick.
- Annual budget column empty -> compute pacing on populated months, flag the gap, ask user to proceed.
- Drill-down line doesn't match any account -> echo closest 3 matches, ask user to pick.
| Local-file mode: file path is missing or unreadable | Wrong path supplied | Echo the path back and ask for the correct one. |
| Query times out | DWH load | Tell the user it's slow and offer to retry -- never auto-retry. |
| Auth / permission error from the MCP | Carta session expired or lacks DWH access | Ask the user to reconnect Carta in Settings -> Connectors. |
| Carta MCP tool calls fail with `McpAuthError` or "tool not available" | Carta authorization or the plugin-owned MCP connection is unavailable. | Use the plugin-owned `carta` server. If Carta tools are still unavailable, tell the user Carta authorization or the plugin-owned MCP connection is required. |
