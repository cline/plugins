# Segmentation: Tiered / Banded Lookup

Use when: You need to assign each item to a *band* or *tier* based on thresholds stored on a dimension (e.g., account segmentation, salary bands, discount brackets), similar to Excel's XMATCH/XLOOKUP with `match_mode = -1` or `1`.

---

## Concept

You have:

- A measure per base item (e.g., revenue per Account)
- A dimension of bands/tiers (e.g., Tier A/B/C/D), with:
  - A threshold metric defined *by that dimension* (e.g., floor or ceiling per Tier)

You want:

- For each base item, one dimension item (one Tier) that best matches its value according to the thresholds.

We implement this with:

1. An `IF` to mark all *eligible* tiers as non-blank
2. `[REMOVE FIRSTNONBLANK: Dim]` or `[REMOVE LASTNONBLANK: Dim]` to pick one tier per base item

---

## Canonical "floor" pattern (largest floor <= value)

Example:

- Dimension: `Tier` (ordered from highest to lowest priority: `Tier A`, `Tier B`, `Tier C`, `Tier D`)
- Metric: `'DATA_Value'` (Number x `Account`)
- Metric: `'INPUT_Tier_Threshold'` (Number x `Tier`) - floors per Tier
- Target metric: `'CALC_Account_Tier'` (Dimension-typed = `Tier`, dimensioned by `Account`)

Formula:

```pigment
IF(
  'DATA_Value' > 'INPUT_Tier_Threshold',
  Tier
)[REMOVE FIRSTNONBLANK: Tier]
```

How it works

1. The comparison `'DATA_Value' > 'INPUT_Tier_Threshold'` is evaluated over the combined dimensionality Account x Tier. It returns TRUE where the account's value is greater than that tier's floor.
2. The `IF('DATA_Value' > 'INPUT_Tier_Threshold', Tier)` creates a Tier-typed block on (Account, Tier): non-blank (the Tier item) where the condition is TRUE, BLANK where the condition is FALSE.
3. The modifier `...[REMOVE FIRSTNONBLANK: Tier]` removes the Tier dimension and, for each Account, returns the first non-blank Tier in the Tier order. With Tier ordered Tier A, Tier B, Tier C, Tier D and increasing floors, this effectively selects the highest-priority Tier whose floor is <= the account's value.

Excel analogy: This pattern is equivalent to XMATCH/XLOOKUP with match_mode = -1 (exact or next smaller), where the floors are sorted and we want the largest floor <= value.

---

## Why dimension order matters

The meaning of FIRSTNONBLANK / LASTNONBLANK is defined by the physical order of items in the dimension:

- If Tier is ordered A -> D and floors increase from D to A: use `[REMOVE FIRSTNONBLANK: Tier]` to pick the highest qualifying tier.
- If Tier is ordered D -> A with the same floors: use `[REMOVE LASTNONBLANK: Tier]` instead to get the same result.

Rule of thumb:

- Top-of-list is highest band -> use FIRSTNONBLANK
- Bottom-of-list is highest band -> use LASTNONBLANK

Changing the dimension order without adjusting FIRST/LAST will change which tier is chosen.

---

## Variations

### 1. Inclusive thresholds

For inclusive floors, prefer `>=` instead of `>`:

```pigment
IF(
  'DATA_Value' >= 'INPUT_Tier_Threshold',
  Tier
)[REMOVE FIRSTNONBLANK: Tier]
```

### 2. Ceiling pattern (smallest ceiling >= value)

If thresholds represent ceilings (upper bounds instead of floors), invert the comparison:

```pigment
IF(
  'DATA_Value' < 'INPUT_Tier_Threshold',
  Tier
)[REMOVE FIRSTNONBLANK: Tier]
```

Choose FIRST vs LAST based on how tiers are ordered.

### 3. Fallback handling

If no tier qualifies (e.g., all floors > value), wrap the expression and manage BLANK explicitly in a second step, or define a "catch-all" tier with a floor of 0.

---

## Best practices

- Be explicit about dimension order whenever using FIRSTNONBLANK/LASTNONBLANK: document in the dimension description which end is "highest" vs "lowest".
- Keep band thresholds on the band dimension (e.g., `INPUT_Tier_Threshold` by Tier), not on the base metric.
- Use dimension-typed metrics when the output is a classification/category (e.g., `CALC_Account_Tier` typed as Tier), to enable consistent reuse in other metrics and tables.
- When explaining to users, map this to the Excel concept of:
  - match_mode = -1 (next smaller) for floor-based bands
  - match_mode = 1 (next larger) for ceiling-based bands

---

## Formula syntax reference

For REMOVE, FIRSTNONBLANK, and LASTNONBLANK syntax, see [formula_modifiers.md](./formula_modifiers.md).
