---
name: carta-create-budget
model: opus
description: 'Build or restructure a fund/ManCo budget workbook in Excel from Carta prior-year actuals. TRIGGER: build/create/draft a budget for a future year; group/categorize budget line items into sections with subtotals; apply an inflation/contingency buffer to budget expenses. NOT: consolidating P&L / balance sheet, fetch-budget, actuals refresh, pacing (carta-budget-vs-actuals), what-if scenarios (carta-budget-scenarios).'
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

# Create budget

Entry point for building a new budget. The skill routes to one of four
references in `references/` based on user intent.

## UX Rules

Inlined here because the Carta CLI session-start hook does not run inside
Claude for Excel. Audience is an accountant.

- Plain English only. Never surface MCP server identifiers, DWH column
  names (`ACCOUNT_TYPE`, `EFFECTIVE_DATE`), UUIDs, raw JSON, SQL, or gate labels.
- Currency formatting: positive `X,XXX`, negatives `(X,XXX)`, totals bolded -- using the resolved currency's symbol, not always `$` (derive the currency from the data, never default to USD; see Hard rules).
- Difference values are absolute -- e.g. `0` for a match, `2,000` for a gap, in the resolved currency.
- Status vocabulary: ✅ Match | ⚠ Mismatch ($X diff) | ❌ Missing in Carta | ❌ Missing in Client Doc.
- No environment URLs. Output goes into Excel cells, not Carta dashboard links.
- Closing summary link is a workbook citation (`<citation:Sheet!Range>`) in
  Claude for Excel mode, and a `file://` path in Cline local-file mode.
  Never both.
- Every numbered choice in this skill -- including the closing
  next-step menu -- must be presented as an explicit user choice. In Cline,
  ask in chat or use the host question UI when available. Do not bury
  choices in closing prose.

## When to use

Build / create / generate / draft a budget for a future year ("build a 2026 budget", "draft from last year's actuals", "make me a 2026 budget for `<entity>`").

Also covers restructuring an existing budget in the workbook:

- "Group / organize / categorize the budget line items into a few top-level categories" -> `references/reorganize-categories.md`
- "Add a 5% inflation buffer to expenses" / "apply a contingency buffer" / "pad the budget by X%" -> `references/inflation-buffer.md`

## DO NOT use this skill for

- Refreshing actuals on existing budget -> `carta-budget-actuals`
- Pacing / variance / on-track -> `carta-budget-vs-actuals`
- What-if scenarios -> `carta-budget-scenarios`
- P&L / income statement -> `carta-consolidating-pnl`
- Balance sheet -> `carta-consolidating-balance-sheet`

---

## Execution discipline

Execute all gates silently. Do not narrate tool calls, intermediate results, or status updates. Only speak at explicit decision points: Gate 0.5 (if runtime is ambiguous), Gate 1 (destination chooser), Gate 2 (parameter gate), Gate 5 (approval), and Gate 7 (next-step menu).

Do NOT output any of the following between gates:
- "Let me probe the server prefix..." / "Good -- prefix is `carta_sandbox`."
- "Now running the DWH queries." / "Queries complete."
- "Approved. Writing now." / "Both tabs branded."
- Any sentence that narrates a tool call you are about to make or just made.

---

## Entry mode -- fresh session vs. chained skill

Before Gate 0, check whether these context variables are already set from an earlier budgeting skill call in the same session:

- `<SERVER>` -- connected Carta MCP server prefix
- `<ENTITY_NAME>` -- the resolved entity name
- `<ENTITY_UUID>` -- the resolved entity UUID
- `<RUNTIME>` -- `excel-addin` or `local-file`

If all four are in context: skip Gates 0 and 0.5 entirely. In Gate 2, pre-fill the entity and skip asking for it -- ask only for `budget_year`, window, and other budget parameters. Proceed from Gate 1.

If any is missing (fresh session or cold invocation): run Gates 0 and 0.5 in order, then continue from Gate 1.

Do not ask "which firm?" or "which runtime?" when those are already established from the skill the user just ran.

---

## Gate 0 -- Carta MCP environment + resolve firm

### Detect the Carta MCP server

In Cline, set `<SERVER>` to `carta` and use the plugin-owned Carta MCP server. If `mcp__carta__welcome` or an equivalent Carta welcome tool is exposed, call it first. Do not call `refresh_mcp_connectors` or probe alternate server prefixes in Cline.

`<SERVER>` is resolved after the plugin-owned Carta MCP server is available. Do not call any other `mcp__<SERVER>__*` tool before `welcome` when that welcome tool is exposed.

If the Carta MCP tools are unavailable, tell the user that Carta authorization or the plugin-owned MCP connection is required and stop. If the source text below references multiple connected Carta prefixes, ignore that host-specific path and keep `<SERVER>` as `carta`.

### Resolve the firm/entity

The Carta MCP exposes three top-level tools: `welcome`, `fetch`, `set_context`. List contexts via `fetch(command="contexts:list", ...)` -- never a direct `list_contexts` top-level tool.

If the user named a firm:
1. `call_tool({"name": "contexts__list", "arguments": {"firm_name": "<entity>"}})`.
2. Multiple matches -> `ask the user` to disambiguate.
3. `set_context(firm_id=<uuid>)`. Do not skip this step -- DWH queries scope to the active context. Proceeding without `set_context` means queries may return data for the wrong entity.

Prefer granular tools when exposed: `mcp__<SERVER>__list_contexts(firm_name=...)` / `set_context(firm_id=...)`.

DWH param-name traps:
- `dwh:execute:query` takes `sql:`, NOT `query:`.
- `dwh:get:table_schema` takes `table_name:`, NOT `table:`.
- `format` accepts `"ndjson"` and `"markdown"`. Not `"csv"`.

If no firm was named, defer to Gate 2.

---

## Gate 0.5 -- Detect runtime

Set `<RUNTIME>`:
- In Cline, default to `local-file`.
- `local-file` -- user supplied a file path (`~/Downloads/Budget.xlsx`) or approved creating a new file on disk.
- If unclear, ask for the source `.xlsx` path and the destination path before reading or writing.

---

## Gate 1 -- Where to write

Branches by `<RUNTIME>`.

If `<RUNTIME>` is `excel-addin`:

Empty-workbook shortcut: if the active workbook has one sheet, `maxRows == 0`, no other tabs (typically a fresh `Book1.xlsx`/`Sheet1`), skip the chooser. Announce the rename in one sentence -- *"I'll use the empty workbook you have open and rename `Sheet1` to `Budget <year>`."* -- then proceed. The chooser only exists to protect non-empty state.

Otherwise, use `ask the user`:

> Where should I put the new budget?

- "Update the open workbook -- new tab (recommended)" -- Claude creates a tab named `Budget <year>`.
- "Update the open workbook -- overwrite an existing tab" -- Cline asks which tab and confirms before overwriting.
- "Create a brand new workbook" -- Claude writes to a fresh file.

If the user has no workbook open at all, default to "brand new workbook" without asking.

If `<RUNTIME>` is `local-file`:

Use `ask the user`:

> Where should I write the budget file?

- "Create a new .xlsx (recommended)" -- ask for the destination path and folder.
- "Modify an existing .xlsx" -- ask for the file path; the skill will add a new sheet inside it (default name `Budget <year>`).

If the user gave a path in the original prompt, skip the choice and use that path.

Done when: the write destination is locked. Store `<DESTINATION>`
(open workbook + tab in add-in mode, or `.xlsx` path + sheet name in
local-file mode) for Gates 5-7.

---

## Gate 2 -- Batched parameter gate

In one `ask the user` call, ask for every parameter the prompt
didn't already specify (do not drip-feed):

- Firm + entity -- if Gate 0's `contexts:list` was ambiguous or the user didn't name one.
- `budget_year` -- required, e.g. 2026.
- `prior_year` -- default `budget_year - 1`.
- Window -- `start_month` / `end_month`, default 01 / 12.
- Frequency -- `monthly` (default) | `quarterly` | `annually`.
- Accounts -- `all enabled` (default) or a list of GL codes.
- `account_lookback_years` -- default 3.
- Sheet name -- default `Budget <budget_year>`.

If a sheet with that name already exists, ask whether to overwrite or
append a suffix.

---

## Gate 3 -- Route to the right reference

Call `read_skill` with the matching `file_path` before doing anything else in this gate. Do not reconstruct the layout or query logic from memory -- the file must be in your context before you write any code.

| Phrase in user's prompt | Call |
|---|---|
| "from last year's actuals", "based on 2025 actuals", "from prior actuals", no qualifier | `read_skill(file_path="references/from-prior-actuals.md")` |
| "use the template", "fill in this template", "Carta template" | `read_skill(file_path="references/from-template.md")` |
| "add a line for <something not in CoA>", "I expect to spend $X on <new category>" | `read_skill(file_path="references/from-recommendation.md")` |
| "by department", "by reporting tag", "sliced by <dimension>", "by sub-account" | `read_skill(file_path="references/slice-by-tag.md")` |
| "group / categorize / organize line items into categories", "add category subtotals" | `read_skill(file_path="references/reorganize-categories.md")` |
| "add a 5% inflation buffer", "apply a contingency buffer", "pad expenses by X%" | `read_skill(file_path="references/inflation-buffer.md")` |

Do not ask the user which mode -- infer from their original prompt. Follow the loaded file. The last two operate on an existing budget tab in the workbook rather than building from scratch -- skip the prior-actuals fetch when the budget is already present.

---

## Gate 5 -- Pre-build review (approval gate)

Present the proposed budget as a preview table -- one row per account, no collapsing sections into a single summary row. If there are 35 accounts, the table has 35 data rows plus section subtotal rows.

| Section | Line Item | GL Code | Prior-Year Total | Proposed Budget Total | Source |
|---|---|---|---|---|---|

Source values: `DWH actual` / `trailing-avg` / `fallback-zero` /
`user-supplied` / `low-confidence -- sparse history`.

If any rows are flagged `low-confidence -- sparse history`, call them
out above the table:

> ⚠ N line items have less than 6 months of history in the lookback
> window -- their proposed amounts are best-effort. Review these
> before approving.

Output the preview table above as a normal conversation message. Then call `ask the user` immediately after -- the `question` field must be a single short sentence; never include preview content inside it.

- `question`: `"Approve writing this budget?"`
- `header`: `"Approval"`
- `multiSelect`: `false`
- `options`:
  1. `label`: `"Approve and write the budget"` / `description`: `"Writes the budget to the destination chosen in Gate 1. <- recommended"`
  2. `label`: `"Edit -- change a parameter (year / window / accounts / sheet name)"`
  3. `label`: `"Cancel"`

The `<- recommended` marker goes inside the `description` field of option 1, not as a suffix on the `label`. Do not write `"Approve and write the budget <- recommended"` as the label.

If the user picks Edit, return to Gate 2 with their feedback. Wait for
explicit approval before writing.

Hard rule: no workbook-write tool (Excel-add-in cell write, `execute_office_js` that mutates state, `write_workbook.py`, or any equivalent) runs before this gate's `ask the user` returns the user's explicit "Approve and write" choice. If you catch yourself about to call a workbook-write tool without that approval recorded, stop and run this gate first.

---

## Gate 6 -- Write and brand the workbook (two tabs, no Provenance)

### Approval-recorded check (run FIRST, before any write tool)

Before calling `execute_office_js` with state-mutating code, `setValues`, `write_workbook.py`, or any other workbook-write tool, look back at your tool history. Find the most recent `ask the user` you sent. Does its answer literally include `"Approve and write"`? If NO, Gate 5 did not pass -- send the Gate 5 approval menu now (preview table + 3-option `ask the user`) and wait for the explicit answer.

Do not interpret upstream answers as approval. A Gate 2 parameter response, a Gate 0.5 runtime answer, or any prior `ask the user` whose answer is not literally `"Approve and write"` does NOT clear this gate. Approval is the answer to the specific Gate 5 question -- nothing else counts.

Restructure paths clear this gate the same way. The categorize-line-items and inflation-buffer paths (`references/reorganize-categories.md`, `references/inflation-buffer.md`) collect their own input first (the category mapping, or the buffer %), then present the standard Gate 5 pre-build review -- a preview of the restructured tab plus the 3-option `ask the user` whose answer is `"Approve and write"`. That `"Approve and write"` answer is what clears this check; the mapping/buffer confirmation alone does not.

Branches by `<RUNTIME>`. Writes two tabs -- `Budget <budget_year>` (primary, hardcoded budget values) and `<prior_year> Actuals` (reference, hardcoded actuals). No Provenance tab.

Before writing a single cell, call both of these in the same message (parallel reads):

1. `read_skill(file_path="references/from-prior-actuals.md")` -- layout, header band, column widths, section order, summary rows.
2. `read_skill(file_path="references/branding-and-header.md")` -- verbatim brand block JS and cell-comment API.

Do not reconstruct either spec from memory. The files must be in your context before you generate any `execute_office_js` or `write_workbook.py` code.

### If `<RUNTIME>` is `excel-addin`

Gate 6 requires AT LEAST four separate `execute_office_js` calls. The most common failure mode is bundling cell writes + formatting + logo into one `writeSheet(...)` function -- the model writes the cells, returns, and forgets the logo. Do not combine Step 6a and Step 6b into a single office.js block.

- Call 1 (Step 6a): cell values, formulas, formatting, column widths, cell comments. One `execute_office_js`. Return.
- Call 2 (Step 6b, tab 1): logo on `Budget <budget_year>`. One `execute_office_js` with the verbatim brand block below.
- Call 3 (Step 6b, tab 2): logo on `<prior_year> Actuals`. Another `execute_office_js` with the same brand block, targeting the other tab.
- Call 4 (Step 6c): verification -- load shape names on both tabs, confirm `CartaLogo` exists.

Returning from Call 1 does NOT finish Gate 6. Returning from Call 2 does NOT finish Gate 6 -- every tab needs its own logo call, and the verification call must come last.

Step 6a -- write the cells. Use the Excel add-in's runtime cell-write tools with the accounting currency format for the resolved currency (`_(<CCY_TOKEN>* #,##0.00_);...` -- see Hard rules). Do not call freeze_panes. For each `low-confidence -- sparse history` account, attach a cell comment to the column-A label cell -- see [`references/branding-and-header.md`](references/branding-and-header.md#cell-comment-pattern-for-sparse-history--projection-flags) for the verbatim `sheet.comments.add(...)` pattern. Never change row fill / font color / border.

Step 6b -- brand both tabs (DO NOT SKIP). Immediately after the
cell writes -- same Gate 6, before any summary text -- embed the Carta
lockup on every tab the skill just wrote.

For each tab the skill just wrote, run the verbatim brand block from [`references/branding-and-header.md`](references/branding-and-header.md) -- one `execute_office_js` per tab. Substitute `<TAB_NAME>`; do not paraphrase the JS. Asset access uses `blobs.getText("assets/powered_by_carta.b64.txt")` -- NOT `Read`, NOT shell `find`. The unlock-set-relock dance preserves aspect ratio.

Step 6c -- verify branding ran (REQUIRED, observable). Before proceeding to Gate 7, run this verification block as a separate `execute_office_js` call:

```javascript
const tabs = ["Budget <budget_year>", "<prior_year> Actuals"];
const result = {};
for (const tabName of tabs) {
  const sheet = context.workbook.worksheets.getItem(tabName);
  sheet.shapes.load("items/name");
  await context.sync();
  result[tabName] = sheet.shapes.items.map(s => s.name);
}
return result;
```

The result must show `CartaLogo` in every tab's shape list. If any tab returns `[]` or its shape list lacks `CartaLogo`, you have skipped Step 6b for that tab -- re-run the brand block for that tab and re-verify. Do not start Gate 7 summary text until this verification returns `CartaLogo` on every tab. The verification call itself is observable evidence; without it in your tool history, Gate 6 is not complete.

### If `<RUNTIME>` is `local-file`

Build a single JSON operations payload that writes the cells AND
adds the logo on both tabs, then apply it in one shot. Branding is
part of the same payload -- do not split it across two `uv run` calls,
do not leave it for "after the user reviews", do not defer it to a
follow-up step.

```bash
uv run "${CLAUDE_PLUGIN_ROOT}/scripts/write_workbook.py" --stdin <<'JSON'
{
  "workbook_path": "<DESTINATION>",
  "create_if_missing": true,
  "operations": [
    /* ...all the cell-write ops for Budget <budget_year> and <prior_year> Actuals... */
    {
      "op": "add_image",
      "sheet": "Budget <budget_year>",
      "path": "${CLAUDE_PLUGIN_ROOT}/skills/carta-create-budget/assets/powered_by_carta.png",
      "anchor": "E1",
      "rows": 3
    },
    {
      "op": "add_image",
      "sheet": "<prior_year> Actuals",
      "path": "${CLAUDE_PLUGIN_ROOT}/skills/carta-create-budget/assets/powered_by_carta.png",
      "anchor": "E1",
      "rows": 3
    }
  ]
}
JSON
```

No `freeze_panes` op. Every `set_format` op for currency uses the locale-token format from the Hard rules section. For each `low-confidence -- sparse history` account, include a `set_comment` op (see `branding-and-header.md` for the JSON shape). Response includes one `add_image` entry per tab with `status: "ok"`; `status: "missing"` means the asset path didn't resolve -- fix it before moving on.

### Hardcoded vs formula cells (both runtimes)

Budget values are hardcoded numbers. Subtotals, `Total Income`, `Total Expenses`, `Net Operating Income` use `=SUM(...)` formulas so totals recompute when the user edits a budget cell.

Done when: both tabs are populated AND both carry a `CartaLogo` shape (Excel) or an `add_image` op with `status: "ok"` (local-file).

---

## Gate 7 -- Summary + next steps

Gate 7 precondition (DO NOT SKIP). Before sending the summary text below, scan your tool history. Three anchors MUST be present in that order:

1. An `ask the user` whose answer included `"Approve and write"` -- Gate 5 approval.
2. A `sheet.shapes.addImage(base64)` call for each tab the skill wrote (one per tab) -- Gate 6b branding.
3. The Step 6c verification `execute_office_js` whose result showed `CartaLogo` on every tab -- Gate 6c verification.

If any anchor is missing, you have skipped a gate. Do NOT write "Carta logo placed at..." in the summary when no `shapes.addImage` call appears in your tool history -- that's hallucinating completion. STOP, go back, run the missing gate, then return here.

Restructure-path carve-out. The categorize-line-items and inflation-buffer paths (`references/reorganize-categories.md`, `references/inflation-buffer.md`) modify an existing, already-branded tab and do not run the brand block -- they require only anchor 1 (the `"Approve and write"` response). Skip anchors 2 and 3 for these paths; do not add a second logo to a tab that already has one. (Only if the restructure rebuilt the tab from scratch and `CartaLogo` is gone do you re-run the brand block and re-verify.)

One or two sentences confirming what got written, with a clickable link
to the result.

If `<RUNTIME>` is `excel-addin`:

> Wrote [Budget 2026](<citation:Budget 2026!A1:N80>) with 47 line items
> across 4 sections, and the source actuals on the
> [2025 Actuals](<citation:2025 Actuals!A1:N80>) tab. Carta logo placed
> at the top of column E on both tabs. Two lines (Salaries, LOC
> interest) flagged for review -- see the Source column in the preview I
> showed you above.

If `<RUNTIME>` is `local-file`:

> Wrote `Budget 2026` (47 line items across 4 sections) plus a
> `2025 Actuals` reference tab to
> `file:///path/to/<budget-workbook>.xlsx`, both branded
> with the Carta logo at the top of column E. Two lines (Salaries, LOC
> interest) flagged for review -- see the Source column in the preview I
> showed you above.

Flag negative-NOI months in the summary. If any monthly Net Income figure in the written sheet is negative, surface the count:

> "⚠ N of 12 months show negative NOI in this projection -- review the lumpy revenue/expense lines before locking the budget."

Don't bury this in a table. The user needs to see it in prose so they can decide whether to revise before sending the workbook downstream.

The next-step menu MUST be a single `ask the user` call with the options below as `options` entries. Never render them as a numbered markdown list, a bulleted list, or inline prose -- bare-text menus break the chooser UI in Claude for Excel and force the user to type the number. The `<- recommended` marker goes inside the `description` field of one option, not as a suffix on the `label`.

1. Refresh actuals against this budget once new postings land <- recommended
2. Run a pacing analysis (Budget vs Actuals)
3. Model a what-if scenario on this budget (headcount cut / revenue shock / cash target)
4. I'm done

Call `ask the user` with these exact parameters:

- `question`: `"What would you like to do next?"`
- `header`: `"Next step"`
- `multiSelect`: `false`
- `options`: the four `label` + `description` pairs above (place `<- recommended` in the `description` field of the recommended option, NOT in the `label`)

Do not bury the menu as closing prose. In Cline, ask clearly in chat or use the host question UI when available before continuing.

Mark one option `<- recommended` based on context -- option 1 by default, option 2 if the budget year is already in progress, option 3 if the user mentioned cash pressure.

When the user selects an option, load the corresponding bundled Cline skill before doing any work. Do not freelance the output -- apply the downstream skill's gates, layout spec, branding rules, and approval flow. Routing:

| Option | Skill to invoke |
|---|---|
| 1 -- Refresh actuals against this budget | `carta-budget-actuals` |
| 2 -- Run a pacing analysis | `carta-budget-vs-actuals` |
| 3 -- Model a what-if scenario | `carta-budget-scenarios` |
| 4 -- I'm done | No invocation; close cleanly |

---

### DWH result formatting

For queries > 50 rows, request `format: "ndjson"` and bucket the result into a blob before working with it. Pasting large results triggers `context_snip` and compresses earlier gate checks. Use `"markdown"` only for <=50-row previews.

## Hard rules

- DWH queries: call `fetch("dwh:execute:query", ...)` directly -- never a generic external-DWH connector. Filter by `FUND_NAME = '<entity>'` (never `FIRM_NAME ILIKE`). Use `AMOUNT` (never the base-currency variant -- NULL in many datasets). Sign-flip revenue: `CASE WHEN LEFT(ACCOUNT_TYPE,1) = '4' THEN -AMOUNT ELSE AMOUNT END`. Preserve reversal entries as-is.
- Budget values are hardcoded numbers (per-account, per-month). Subtotals, Total Income, Total Expenses, and Net Operating Income use `=SUM(...)` formulas so totals recompute when the user edits.
- Currency -- derive from the data, never default to USD. Resolve the workbook's presentation currency before writing (entity properties via `welcome`, or the currency on the actuals data); if it can't be resolved, ask the user. The format uses the locale token `<CCY_TOKEN>` for the resolved currency -- `[$$-en-US]` USD, `[$€-x-euro2]` EUR, `[$£-en-GB]` GBP, `[$$-en-CA]` CAD, or the matching `[$<symbol>-<locale>]`. The `A4` band reads `Amounts in <resolved_currency>`.
- Currency format: `_(<CCY_TOKEN>* #,##0.00_);_(<CCY_TOKEN>* (#,##0.00);_(<CCY_TOKEN>* "-"??_);_(@_)`. A bare `$` renders in system locale (`R$` on pt-BR) -- never use it.
- Do not freeze panes. Do not write a Provenance tab -- source data lives on the `<prior_year> Actuals` tab.
- Two-row header for month-bucketed tables. Row N = one merged cell per month label. Row N+1 = sub-headers. `range.merge(true)` destroys trailing cell values -- never merge over a row that already holds sub-headers; insert a new row first.
- Month-label date-serial trap. `"Jan 2026"` auto-coerces to a date serial. Prefix with `'` to force text, or write a real date with `numberFormat: "mmm yyyy"`.
- Border syntax (Office.js): `style = "Continuous"`, then `weight = "Thin"`. Never `style: "Thin"`.
- Low-confidence rows are flagged with cell comments only -- no fill, font color, border, or italic. Attach to the column-A account-name cell.
- Brand every generated tab in Gate 6. Both tabs MUST carry a `CartaLogo` shape (Excel) or `add_image` op with `status: "ok"` (local-file) before Gate 7 summary runs. Use the bundled assets in this skill's `assets/` -- never link to another plugin's assets.
- In local-file mode, never silently overwrite an existing `.xlsx` -- the helper returns a "sheet exists" status; surface it to the user.

---

## Schema discovery

Source: the Carta DWH journal-entries table. If column names are needed, look up the table via the Carta MCP DWH schema command once at Gate 0.

## Error handling

Never auto-retry. Always surface the failure and let the user decide.

- No Carta MCP connected -> "Open Settings -> Connectors in Claude, enable Carta, then retry."
- `contexts:list` returns no firm -> echo name, ask for spelling. Don't silently near-match.
- Sparse lookback (< 6 months for many accounts) -> flag rows `low-confidence`, surface count, let user decide.
- Tab name collision -> ask to overwrite, append suffix (`Budget 2026 (2)`), or cancel.
- Local-file: unreadable path / openpyxl error -> echo path, confirm it's a valid `.xlsx`.
- Auth error from MCP -> ask user to reconnect Carta. Do not auto-retry.
- Carta MCP tool calls fail (`McpAuthError` or "tool not available") -> use the plugin-owned `carta` server. If Carta tools are still unavailable, tell the user Carta authorization or the plugin-owned MCP connection is required.
