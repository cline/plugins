# Branding and 4-row header -- Carta budgeting standard

Canonical spec for the 4-row header band + Carta logo placement. Read whenever a skill is about to write a tab.

## Row layout (column B)

| Cell | Content | Style |
|---|---|---|
| B1 | `<FIRM-FULL-NAME>` | bold, size 10 |
| B2 | Title with descriptive subtitle (e.g. `2026 Budget (based on 2025 actuals)`) | bold, size 10 |
| B3 | Source (e.g. `Source: Carta Fund Admin · DWH journal entries`) | italic, size 10 |
| B4 | Other context (e.g. `Amounts in USD` / `As of YYYY-MM-DD`) | italic, size 10 |
| B5 | blank | -- |
| Row 6 | Column headers | bold, white on black, centered |

B2 must be descriptive, not bare -- append the provenance subtitle so the user can identify the tab from B2 alone.

## Logo placement

- Anchor: column E, cell E1 -- consistent with the Carta budgeting standard across all budget and consolidating skills.
- Height: combined height of rows 1-3.
- Width: proportional to PNG aspect ratio.
- One logo per tab. Bundled assets at `assets/powered_by_carta.png` (PNG) and `assets/powered_by_carta.b64.txt` (base64 sidecar for Excel runtime).

## Brand block (Excel add-in) -- verbatim, NO paraphrasing

Asset access uses `blobs.getText(...)` -- NOT `Read` or filesystem paths.

```javascript
const base64 = blobs.getText("assets/powered_by_carta.b64.txt").trim();

const sheet = context.workbook.worksheets.getItem("<TAB_NAME>");
const shapes = sheet.shapes;
shapes.load("items/name");
await context.sync();

for (const s of shapes.items) {
  if (s.name === "CartaLogo") s.delete();
}
await context.sync();

const rows = sheet.getRange("E1:E3");
rows.load(["left", "top", "height"]);
await context.sync();

const image = sheet.shapes.addImage(base64);
image.name = "CartaLogo";

image.load(["width", "height"]);
await context.sync();
const ratio = image.width / image.height;

image.lockAspectRatio = false;
image.height = rows.height;
image.width = rows.height * ratio;
image.left = rows.left;
image.top = rows.top;
image.lockAspectRatio = true;
await context.sync();
```

The unlock-set-relock dance preserves aspect ratio. Skipping the `image.load(["width", "height"])` round-trip stretches the logo.

Run this block in a separate `execute_office_js` call (not bundled with the cell writes). After it completes for every tab, verify with `shapes.load("items/name")` + a return value showing `CartaLogo` in the items.

## Local-file -- `add_image` op

```json
{
  "op": "add_image",
  "sheet": "<TAB_NAME>",
  "path": "${CLAUDE_PLUGIN_ROOT}/skills/carta-consolidating-pnl/assets/powered_by_carta.png",
  "anchor": "E1",
  "rows": 3
}
```

The script sizes height to `rows × 15pt × 4/3 px` and computes width from PNG aspect ratio. Response includes one entry per tab with `status: "ok"`. If `status: "missing"`, fix the path.

## Cell-comment pattern (for sparse-history / projection flags)

```javascript
sheet.comments.add("B<row>", "Less than 6 months of activity in <prior_year>. Best-effort projection -- review before locking the budget.", "Plain");
await context.sync();
```

Comments only -- no fill / font color / border / italic.

## Hard rules

- Rows 1-4 are reserved. Never write data into B1-B4 (except the four metadata strings) and never shift the band down.
- Asset access uses `blobs.getText("assets/...")` in Excel add-in -- NOT `Read`, NOT shell `find`.
- Border syntax (Office.js): `style = "Continuous"`, then `weight = "Thin"`. The string `"Thin"` is not a valid `style` -- setting `style: "Thin"` raises InvalidArgument.
- Never link to another plugin's branding assets. Each skill bundles its own copy.
