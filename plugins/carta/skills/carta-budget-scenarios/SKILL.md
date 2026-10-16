---
name: carta-budget-scenarios
model: opus
description: 'Build what-if scenario columns on an existing Excel budget workbook -- trim, growth, or additive layers (new fund raise, headcount/FTE hires, expansion). TRIGGER: what-if questions, "how would X affect next year''s budget/P&L", model/simulate a scenario, impact of raising a fund or hiring, forward projections with timing sensitivity. NOT: new budgets (carta-create-budget), fetch-budget, actuals refresh, pacing, historical/consolidating financial statements (carta-consolidating-pnl / carta-consolidating-balance-sheet).'
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

# Budget scenarios

What-if modelling on top of an existing budget. Five scenario references grouped into trim and growth, plus a shared helper:

Trim:

- [`references/headcount-reduction.md`](references/headcount-reduction.md) -- reduce headcount by a target %.
- [`references/revenue-shock.md`](references/revenue-shock.md) -- apply a haircut to revenue.
- [`references/cost-rebalance.md`](references/cost-rebalance.md) -- open-ended, user states a cash goal.

Growth:

- [`references/new-fund-raise.md`](references/new-fund-raise.md) -- model fee revenue uplift from closing a new fund.
- [`references/expansion-hire.md`](references/expansion-hire.md) -- add N new FTEs at a stated comp band.

Shared helper (used by Step 4):

- [`references/get-actuals.md`](references/get-actuals.md) -- canonical YTD-actuals query, so scenarios are grounded in real spend rather than just budget assumptions.

Growth references can stack with each other when the user mentions multiple
levers in one prompt (e.g. "raise a $500M fund AND hire 5 FTEs") -- see the
"Stacking" section in each growth reference.

## UX Rules

Audience is an accountant in Excel. Plain English only. Never surface MCP
identifiers, DWH column names, UUIDs, raw JSON, SQL, or step labels.
Currency: `$X,XXX` positive, `($X,XXX)` negative, totals bolded.
Differences are absolute. Status: ✅ Match | ⚠ Mismatch ($X diff) | ❌ Missing in Carta | ❌ Missing in Client Doc.

Closing summary link is a workbook citation (`<citation:Sheet!Range>`) in
Claude for Excel mode, and a `file://` path in Cline local-file mode.

Every numbered choice in this skill -- including the closing
next-step menu -- must be presented as an explicit user choice. In Cline,
ask in chat or use the host question UI when available. Do not bury
choices in closing prose.

## When to use

Trim:

- "What if we cut headcount 10%?"
- "Model a 15% revenue shortfall"
- "Show me 3 trim options"
- "Propose 3 ways to preserve $500k of cash"
- "Compare two budget scenarios"
- "What happens if travel doubles?"

Growth:

- "What if we raise a new $500M fund?"
- "Model the P&L impact of Fund V closing in Q1"
- "Show revenue uplift from a $300M / $500M / $750M close"
- "Model hiring 5 FTEs in 2027"
- "Compare a 3 / 5 / 7 hire ramp"
- "How does next year's P&L look if we raise a new fund AND hire 5 FTEs?"

## DO NOT use this skill for

- Building a new budget -- use `carta-create-budget`.
- Refreshing actuals on an existing budget -- use `carta-budget-actuals`.
- Pacing / variance / "how are we doing" -- use `carta-budget-vs-actuals`.
- Historical / consolidating P&L or income statements (a P&L *statement* for a closed period, not a forward what-if) -- use `carta-consolidating-pnl`. A forward "how would X affect our P&L" what-if belongs here.

---

## Execution discipline

Execute all steps silently. Do not narrate tool calls, intermediate results, or status updates. Only speak at explicit decision points: Step 0.5 (if runtime is ambiguous), Step 1 (destination chooser), Step 2 (intent routing), Step 3 (parameter gate), Step 6 (approval), and Step 8 (next-step menu).

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

Resolve firm: if user named one -> `call_tool({"name": "contexts__list", "arguments": {"firm_name": "<entity>"}})` -> disambiguate via `ask the user` if multiple -> `set_context(firm_id=<uuid>)`.

DWH param-name traps: `dwh:execute:query` takes `sql:` not `query:`. `dwh:get:table_schema` takes `table_name:` not `table:`. `format` accepts `"ndjson"` / `"markdown"`, not `"csv"`.

If no firm was named, defer to Step 3.

## Step 0.5 -- Detect runtime

In Cline, set `<RUNTIME>` to `local-file` and ask for a user-supplied `.xlsx` path or a user-approved new workbook path when needed.

## Step 1 -- Where should the scenarios live

Branches by `<RUNTIME>`.

If `<RUNTIME>` is `excel-addin`:

Empty-workbook shortcut: if the active workbook has one sheet, `maxRows == 0`, no other tabs (typically a fresh `Book1.xlsx`/`Sheet1`), skip the chooser. Announce the rename in one sentence -- *"I'll use the empty workbook you have open and rename `Sheet1` to `Scenarios`."* -- then proceed. The chooser only exists to protect non-empty state.

> Where should the scenarios live?

- "Add scenario columns next to the existing budget" (recommended for <=3 scenarios).
- "Create a new `Scenarios` tab" (recommended for >3 scenarios or wide pivots).
- "Clone the workbook -- leave the original untouched".

If `<RUNTIME>` is `local-file`:

> Where should the scenarios live?

- "Add a `Scenarios` sheet to the same file" (recommended).
- "Write a separate `<budget>-scenarios.xlsx` file alongside the original" (preserves the original).

Store `<DESTINATION>` (open workbook + tab in add-in mode, or `.xlsx`
path + sheet name in local-file mode).

## Step 2 -- Intent routing

| Phrase | Reference |
|---|---|
| "cut headcount", "reduce salaries", "team reduction", "trim staffing", "headcount X%" | [`headcount-reduction.md`](references/headcount-reduction.md) |
| "revenue shortfall", "revenue haircut", "if revenue drops", "demand shock" | [`revenue-shock.md`](references/revenue-shock.md) |
| "preserve $X cash", "hit a cash target", "free up cash", "propose ways to reduce spend" | [`cost-rebalance.md`](references/cost-rebalance.md) |
| "raise a new fund", "Fund <N> closing", "new fund raise", "AUM uplift", "management fee impact of a new fund" | [`new-fund-raise.md`](references/new-fund-raise.md) |
| "hire N FTEs", "add headcount", "expand the team", "hire ramp", "model new hires" | [`expansion-hire.md`](references/expansion-hire.md) |

Multi-lever prompts. If the user names more than one of the above in a
single prompt (e.g. "raise a $500M fund AND hire 5 FTEs"), route to every
matching reference. Combine their outputs into composed scenarios -- each
scenario column reflects the joint effect of all selected levers, and the
cash-impact summary breaks out each leg (e.g. `New-Fund Fees`, `New Personnel`,
`Net`). Do NOT run the references serially as separate outputs.

Immediately call `read_skill` for every matched reference -- do not reconstruct scenario logic from memory:

| Reference matched | Call |
|---|---|
| headcount-reduction | `read_skill(file_path="references/headcount-reduction.md")` |
| revenue-shock | `read_skill(file_path="references/revenue-shock.md")` |
| cost-rebalance | `read_skill(file_path="references/cost-rebalance.md")` |
| new-fund-raise | `read_skill(file_path="references/new-fund-raise.md")` |
| expansion-hire | `read_skill(file_path="references/expansion-hire.md")` |

## Step 3 -- Parameter gate (batched)

Reference-specific. Generally include:

- Number of scenarios (default 3).
- Target % or target dollar amount.
- Scope -- all lines vs a section (e.g. only Personnel, only Operating Expenses).
- Distribution rule when applicable (across-the-board, junior-heavy, senior-heavy, etc.).

## Step 4 -- Read the base budget + YTD actuals

If `<RUNTIME>` is `excel-addin`: use the add-in's read tools.

If `<RUNTIME>` is `local-file`:

```bash
uv run "${CLAUDE_PLUGIN_ROOT}/scripts/read_workbook.py" \
  "<BUDGET_PATH>" --sheet "<BUDGET_SHEET>"
```

Pull YTD actuals via
[`references/get-actuals.md`](references/get-actuals.md)
so scenarios are grounded in real spend rather than just budget
assumptions.

## Step 5 -- Generate scenarios

Each reference computes its own scenarios. Outputs are always
relative to the base budget as live formulas where possible
-- so the user can edit inputs and see scenarios recalculate.

- Trim references scale existing lines: `=Base!H12 * 0.9` for a 10% trim.
- Growth references add new rows whose scenario columns reference
  user-editable named inputs at the top of the Scenarios tab: e.g.
  `=fund_size * fee_rate * months_after_close / 12`. Never hardcode the
  fund size, fee rate, hire count, or comp band -- those must be editable
  cells so the user can flex them post-build.

## Step 6 -- Pre-build review (approval gate)

Preview table:

| Section | Line Item | Base | Scenario 1 | Scenario 2 | Scenario 3 | Recommended Δ |
|---|---|---|---|---|---|---|
| Personnel | Salaries | $4,200,000 | $3,780,000 | $3,360,000 | $2,940,000 | ($420,000) |

(Sample row shows the format -- currency with `$`, negatives in parentheses, totals would be bolded. Column header is `Recommended Δ` regardless of trim vs growth -- the value is the absolute change for the recommended scenario.)

Plus a cash-impact summary block at the bottom of the preview. Columns
depend on the reference(s) that ran:

- Trim references: `Scenario | Annual Spend Δ | Projected Cash at Year-End | NOI Δ`
- Growth references: see the cash-impact-summary table in each growth reference (the columns name the specific lever -- `New-Fund Fees Y1`, `New Personnel Y1`, etc.).
- Multi-lever (stacked) prompts: include one column per leg PLUS a `Net` column showing the combined effect.

Output the preview table and cash-impact summary above as a normal conversation message. Then call `ask the user` immediately after -- the `question` field must be a single short sentence; never include preview content inside it.

- `question`: `"Approve writing these scenarios?"`
- `header`: `"Approval"`
- `multiSelect`: `false`
- `options`:
  1. Approve and write the scenarios <- recommended (`description`: `"Writes the scenario columns to the destination chosen in Step 1."`)
  2. Edit -- change the target %, scenario count, or scope
  3. Cancel

The `<- recommended` marker goes inside the `description` field of option 1, not as a suffix on the `label`.

Wait for explicit OK.

Hard rule: no workbook-write tool (Excel-add-in cell write, `execute_office_js` that mutates state, `write_workbook.py`, or any equivalent) runs before this gate's `ask the user` returns the user's explicit "Approve and write" choice. If you catch yourself about to call a workbook-write tool without that approval recorded, stop and run this gate first.

## Step 7 -- Write and brand the tabs

### Approval-recorded check (run FIRST, before any write tool)

Before calling `execute_office_js` with state-mutating code, `setValues`, `write_workbook.py`, or any other workbook-write tool, look back at your tool history. Find the most recent `ask the user` you sent. Does its answer literally include `"Approve and write the scenarios"`? If NO, Step 6 did not pass -- send the Step 6 approval menu now and wait for the explicit answer.

Do not interpret upstream answers as approval. A parameter response, a routing answer, or any prior `ask the user` whose answer is not literally `"Approve and write the scenarios"` does NOT clear this gate.

### Step 7 requires AT LEAST three separate `execute_office_js` calls (excel-addin runtime)

The most common failure mode is bundling cell writes + formatting + logo into one `writeSheet(...)` function -- the model writes the cells, returns, and forgets the logo. Do not combine the cell-write call with the brand block in a single office.js block.

- Call 1: cell values, formulas, formatting. One `execute_office_js`. Return.
- Call 1.5 (blob pre-flight, REQUIRED before logo): verify the asset store is populated:
  ```javascript
  const keys = blobs.keys();
  return { blobKeys: keys };
  ```
  If `blobKeys` is empty (`[]`), stop immediately -- do NOT attempt the brand block and do NOT proceed to the summary. Surface this message to the user:
  > "The Carta logo asset isn't loaded yet in this session. Please close the skill panel, wait a moment, then reopen it and try again. The scenario data has been written -- only the branding step is pending."
  Do not silently skip branding. Do not mark the branding step as complete. Do not write Step 8 summary text.
- Call 2 (per tab touched): logo via the verbatim brand block from `branding-and-header.md`. Only run this after Call 1.5 confirms `blobKeys` is non-empty.
- Call N (verification, LAST): load shape names on every tab touched, confirm `CartaLogo` exists.

Returning from Call 1 does NOT finish Step 7. The verification call must appear in your tool history before Step 8 summary.

Before any write, call both of these in the same message (parallel reads):

1. `read_skill(file_path="references/branding-and-header.md")` -- 4-row metadata band, logo placement, `blobs.getText` asset pattern, cell-comment API.
2. `read_skill(file_path="references/<scenario-reference-from-step-2>.md")` -- the scenario file(s) matched in Step 2 (call one per reference for multi-lever prompts).

Do not reconstruct either spec from memory. All files must be in your context before generating any `execute_office_js` or `write_workbook.py` code. The `branding-and-header.md` file defines the reserved 4-row metadata band (A1 firm / A2 descriptive title like `"2026 Budget · Senior-heavy trim scenario"` / A3 source / A4 other context), the Carta logo placement (column E, rows 1-3 height), the `blobs.getText("assets/...")` asset-loading pattern for Excel add-in (NOT `Read`), and the cell-comment pattern for any low-confidence flag. If the existing Budget tab does not already have the 4-row band, add it as part of this write (shift data via `sheet.getRange("1:5").insert(...)`).

If `<RUNTIME>` is `excel-addin`: use the add-in's cell-write tools.
Either side-by-side columns next to the existing budget, or a new
`Scenarios` tab with a header section explaining each scenario's
assumptions. After cell writes, brand every tab the skill touched --
both the existing Budget tab (if a header band was inserted) and any
new `Scenarios` tab -- using the verbatim brand block in
`branding-and-header.md`.

If `<RUNTIME>` is `local-file`:

```bash
uv run "${CLAUDE_PLUGIN_ROOT}/scripts/write_workbook.py" --stdin <<'JSON'
{
  "workbook_path": "<DESTINATION>",
  "operations": [ ... ]
}
JSON
```

Mark one scenario `<- recommended` in the cash-impact summary based on
whichever best meets the user's goal (least painful trim that hits the
target, smoothest NOI impact, etc.).

### Branding verification (REQUIRED, observable, excel-addin only)

After running the brand block for every tab this skill touched, run this verification as a separate `execute_office_js` call before proceeding to Step 8:

```javascript
const tabs = [/* "Scenarios", "Budget 2026", ... -- substitute the actual tab names touched */];
const result = {};
for (const tabName of tabs) {
  const sheet = context.workbook.worksheets.getItem(tabName);
  sheet.shapes.load("items/name");
  await context.sync();
  result[tabName] = sheet.shapes.items.map(s => s.name);
}
return result;
```

The result must show `CartaLogo` in every tab's shape list. If any tab lacks `CartaLogo`, re-run the brand block for that tab and re-verify. Do not start Step 8 summary text until this verification returns `CartaLogo` on every tab.

Never silently skip branding. If the verification returns `[]` or an empty shape list, that means the brand block did not run successfully -- do NOT proceed. If blobs were empty (Call 1.5 returned `[]`), surface the reload message above and stop. If blobs were available but `addImage` still failed, surface the error and let the user decide.

## Step 8 -- Summary + next steps

Step 8 precondition (DO NOT SKIP). Before sending the summary text below, scan your tool history. Three anchors MUST be present in that order:

1. An `ask the user` whose answer included `"Approve and write the scenarios"` -- Step 6 approval.
2. A `sheet.shapes.addImage(base64)` call for each tab the skill touched -- Step 7 branding.
3. The branding-verification `execute_office_js` whose result showed `CartaLogo` on every tab -- Step 7 verification.

If any anchor is missing, STOP, go back, and run the missing gate. Do NOT write "Carta logo placed at..." in the summary when no `shapes.addImage` call appears in your tool history.

Open the summary with a verb that matches the reference(s) that ran:

- Trim references -> "Modeled 3 trim options..."
- `new-fund-raise` -> "Modeled the fund-raise impact at 3 close sizes..."
- `expansion-hire` -> "Modeled 3 hire-ramp scenarios..."
- Multi-lever (stacked) -> "Modeled the combined impact of a new fund + N hires across 3 scenarios..."

If `<RUNTIME>` is `excel-addin`:

> Modeled 3 trim options for Example MgmtCo. Scenario 2 (Senior-heavy
> reduction) preserves $487,000 of cash at year-end with the smallest
> impact on Q1 momentum -- recommended. Full breakdown on
> [Scenarios](<citation:Scenarios!A1:H40>).

If `<RUNTIME>` is `local-file`:

> Modeled 3 trim options for Example MgmtCo. Scenario 2 (Senior-heavy
> reduction) preserves $487,000 of cash at year-end -- recommended.
> Full breakdown written to `Scenarios` in
> `file:///path/to/<budget-workbook>.xlsx`.

The next-step menu MUST be a single `ask the user` call with the options below as `options` entries. Never render them as a numbered markdown list, a bulleted list, or inline prose -- bare-text menus break the chooser UI in Claude for Excel and force the user to type the number. The `<- recommended` marker goes inside the `description` field of one option, not as a suffix on the `label`.

1. Model a different scenario type (revenue shock, cost rebalance, new-fund raise, expansion hire) <- recommended
2. Drill into one of the scenarios -- show me the impacted lines
3. Run a fresh pacing analysis using the recommended scenario as the new baseline
4. I'm done

Call `ask the user` with these exact parameters:

- `question`: `"What would you like to do next?"`
- `header`: `"Next step"`
- `multiSelect`: `false`
- `options`: the four `label` + `description` pairs above (place `<- recommended` in the `description` field of the recommended option, NOT in the `label`)

Do not bury the menu as closing prose. In Cline, ask clearly in chat or use the host question UI when available before continuing.

Mark option 1 `<- recommended` after the first scenario set; option 3
if the user is exploring "what would the new pacing look like".

When the user selects an option, load the corresponding bundled Cline skill before doing any work. Do not freelance the output -- apply the downstream skill's gates, layout spec, branding rules, and approval flow. Routing:

| Option | Skill to invoke |
|---|---|
| 1 -- Model a different scenario type | `carta-budget-scenarios` re-entry with the new scenario type |
| 2 -- Drill into one of the scenarios | Stay in this skill -- render the impacted-lines breakdown inline |
| 3 -- Run a fresh pacing analysis using the scenario as baseline | `carta-budget-vs-actuals` |
| 4 -- I'm done | No invocation; close cleanly |

---

### DWH result formatting

Queries > 50 rows: request `format: "ndjson"`, bucket into a blob. Don't paste large results -- triggers `context_snip`. Use `"markdown"` only for <=50-row previews.

## Hard rules

- All scenario values are live formulas referencing the base budget -- never hardcoded duplicates.
- Recommended scenario needs a one-sentence rationale in the cash-impact summary.
- Local-file: openpyxl preserves formulas; scenarios use `='Budget 2026'!H12 * 0.9` syntax (single quotes around sheet names with spaces).
- Scenario labels are mechanistic, not sentiment-based. Use `Across-the-board` / `Junior-heavy` / `$300M close` / `Base + Fund V`. Never `Bull / Base / Bear`, `Optimistic / Pessimistic`, `Best case / Worst case` -- describe what changed, not how to feel.
- Two-row header for month-bucketed tables. Row N = merged month label. Row N+1 = sub-headers. Never write both into the same row -- subsequent merges destroy sub-headers.
- `range.merge(true)` discards trailing cells. Insert a new row first.
- Month-label date-serial trap: prefix with `'` or use `numberFormat: "mmm yyyy"` on a real date.
- Label/header text beginning with `+`, `=`, `-`, or `@` parses as a formula. Prefix such text with a leading `'` (or a space), or drop the leading symbol -- including Δ-delta and `+ Δ` scenario column headers.
- Set `Worksheet.position` in a separate `context.sync()`, never in the same statement as `worksheets.add()`. Create and activate first: `const sh = sheets.add(name); sh.activate(); await context.sync();`.
- Currency -- derive from the data, never default to USD. Resolve the workbook's presentation currency before writing (entity properties via `welcome`, or the currency on the base budget data); if it can't be resolved, ask the user. Apply the accounting format with the locale token for the resolved currency -- `[$$-en-US]` USD, `[$€-x-euro2]` EUR, `[$£-en-GB]` GBP, `[$$-en-CA]` CAD, or the matching `[$<symbol>-<locale>]`. The token locks display to the fund's currency regardless of the user's Excel locale; a bare `$` renders as the local symbol. The `A4` band reads `Amounts in <resolved_currency>`.
- Border syntax (Office.js): `style = "Continuous"`, then `weight = "Thin"`. Never `style: "Thin"`.
- Recalc + column widths (excel-addin): the last statements in the cell-write `execute_office_js` block (Call 1), in this order -- never a separate call: restore automatic calc -> `context.workbook.application.calculate(Excel.CalculationType.full)` -> set fixed widths on label columns -> autofit numeric columns only -> `context.sync()`. Pattern:
  ```javascript
  context.workbook.application.calculationMode = Excel.CalculationMode.automatic;
  context.workbook.application.calculate(Excel.CalculationType.full);
  sheet.getRange("A:A").format.columnWidth = 120;  // Section -- fixed
  sheet.getRange("B:B").format.columnWidth = 180;  // Line Item -- fixed
  sheet.getRange("C:<last_col>").format.autofitColumns();  // Base + scenario columns only
  await context.sync();
  ```
  Why fixed widths for label columns: `autofitColumns()` on the full range sizes column A to the widest section name, making it excessively wide. Always set A and B explicitly, autofit only C onwards. Recalc before autofit: scenario values are live formulas -- without the forced recalc they stay at 0 and accounting format shows `-` (then `####` after autofit). In local-file mode, add a `set_column_width` op for columns A and B, then `autofit_columns` over C onwards. Never autofit a header-only range.
- Branding standards -- follow [`references/branding-and-header.md`](references/branding-and-header.md) for every tab. Rows 1-4 reserved, logo at column E, `blobs.getText("assets/...")` for asset access.

---

## Error handling

Never auto-retry. Always surface the failure and let the user decide.

- No Carta MCP connected -> "Open Settings -> Connectors, enable Carta, retry."
- Headcount-reduction: no personnel lines -> echo closest matches (Salaries/Wages/Bonuses/Benefits), ask user which to include.
- Revenue-shock: no revenue rows -> surface sections found, ask which lines are revenue.
- Cost-rebalance: no cash cell/tab -> ask user for current cash.
- New-fund-raise: no Income section -> echo closest section labels, ask where to add `Mgmt Fee -- <Fund>`.
- New-fund-raise: non-numeric fund size -> ask for the specific dollar figure(s).
- Expansion-hire: no Personnel section -> fall back to `headcount-reduction.md` GL patterns, confirm placement.
- Expansion-hire: loadings unclear -> default payroll tax 8% / benefits 20% / bonus 15%, show defaults so user can override.
- User uses sentiment labels (Bull/Base/Bear) -> acknowledge, label scenarios mechanistically in output (`$300M close`, `$500M close`). Never carry sentiment into the workbook.
- Recommended scenario doesn't hit target -> surface gap, ask whether to widen lever set.
- Auth error -> ask user to reconnect Carta. Do not auto-retry.
- Carta MCP tool calls fail (`McpAuthError` or "tool not available") -> use the plugin-owned `carta` server. If Carta tools are still unavailable, tell the user Carta authorization or the plugin-owned MCP connection is required.
