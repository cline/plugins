# Branding and 4-row header -- Carta budgeting standard

Canonical spec for the 4-row header band + Carta logo placement.

> Per-skill overrides -- carta-budget-actuals:
> 1. Logo anchors at column E (cell E1) -- the standard anchor across all Carta budget/consolidating skills. Rows 1-3 are the reserved metadata band, so column E floats the logo clear of the Layout A interleaved data grid (where B-D hold the first month's Budget/Actual/Variance).
> 2. Metadata band lives in column A, not column B. Column A holds account labels in Layout A. The cell-comment for sparse-history rows also moves from B to A.

## Row layout (column A -- per override above)

| Cell | Content | Style |
|---|---|---|
| A1 | `<FIRM-FULL-NAME>` | bold, size 10 |
| A2 | Title with descriptive subtitle (e.g. `2026 Budget · Refreshed through Apr-26`) | bold, size 10 |
| A3 | Source (e.g. `Source: Carta Fund Admin · DWH journal entries`) | italic, size 10 |
| A4 | Other context (e.g. `Refreshed YYYY-MM-DD`) | italic, size 10 |
| A5 | blank | -- |
| Row 6 | Column headers | bold, white on black, centered |

A2 must be descriptive, not bare.

## Logo placement

- Anchor: column E, cell E1 (all Carta budget and consolidating skills anchor the logo at column E -- it clears the column-A metadata band in every layout).
- Height: combined height of rows 1-3.
- Width: proportional to PNG aspect ratio.
- Bundled assets at `assets/powered_by_carta.png` and `assets/powered_by_carta.b64.txt`.

## Brand block (Excel add-in) -- verbatim, NO paraphrasing

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

Run in a separate `execute_office_js` call (not bundled with cell writes). After it completes for every tab, verify with `shapes.load("items/name")` showing `CartaLogo` in the items.

## Local-file -- `add_image` op

```json
{
  "op": "add_image",
  "sheet": "<TAB_NAME>",
  "path": "${CLAUDE_PLUGIN_ROOT}/skills/carta-budget-actuals/assets/powered_by_carta.png",
  "anchor": "E1",
  "rows": 3
}
```

## Cell-comment pattern (sparse-history flag)

```javascript
sheet.comments.add("A<row>", "Less than 6 months of activity in <prior_year>. Best-effort projection -- review before locking the budget.", "Plain");
await context.sync();
```

Comments only -- no fill / font color / border / italic.

## Hard rules

- Rows 1-4 are reserved. Never write data into A1-A4 (except the four metadata strings).
- Asset access uses `blobs.getText("assets/...")` -- NOT `Read`, NOT shell `find`.
- Border syntax (Office.js): `style = "Continuous"`, then `weight = "Thin"`.
- Never link to another plugin's branding assets.
