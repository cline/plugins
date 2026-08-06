# Narrowing data in a View

## Terminology (do not confuse)

| Pigment feature | UI label | API / tool | When to use |
| --- | --- | --- | --- |
| Page Selector | Pages | `pages[]` + default items | Default when user asks to "filter", "focus on", "for Year X", "show only France", pick Version/Scenario |
| View Filter | Filters (on row/column pivots) | `filters[]` | Exclusion, top-N by metric value, property-based rules Page Selectors cannot express |
| Board Page Selector | Board Pages | `update_board` page config | Same as Page Selector, but shared across widgets on a Board |

## Interpreting user language

When the user says "filter", "for 2024", "focus on EMEA", "Actuals only" - they almost always mean a Page Selector (View `pages` with a default item), not a View Filter object.

Use View Filters only when the request is clearly value-based (e.g. "top 10 suppliers by cost") or exclusion logic Page Selectors cannot do.

Both can apply: e.g. "top 10 suppliers for Year 2024" -> Year via Page Selector; top 10 via View Filter (ValueField).

### Page Selectors (Pages)

The simplest way to reduce what's shown: configure Default Items on a Page Selector to restrict which data is displayed. For example, setting Default Items to "Q1 2024" on a Quarter Page Selector means only Q1 data is displayed - no View Filter configuration needed.

Grouping pivots can also be used in Pages. Selecting a value on a Grouping Page Selector narrows base items (e.g., Months) whose property chain matches the selected target (e.g., Year = FY 2024 -> only Months with `_year` = FY 2024).

### View Filters (API `filters[]`)

For more control than Page Selectors, use View Filters. There are several types.
Filters are applied after creation via `tool:update_view_filters`, using pivot ids from the `tool:create_view` response.

CRITICAL REQUIREMENT: The `pivotFieldId` in filters MUST reference a pivot from the rows or columns arrays, NOT from the pages array.

### PivotField Filters (By Items)

Used to exclude Dimension items based on which modalities are present in a pivot.

Note: To narrow to specific items (inclusion), prefer Page Selectors instead. Use PivotField Filters only when you need to exclude items or apply complex filtering logic.

Configuration:

```json
{
  "type": "PivotField",
  "pivotFieldFilteringOption": {
    "pivotFieldId": "<pivot-field-id>", // MUST be from rows or columns, NOT pages!
    "compareOperator": "IsIn",
    "modalityIds": ["<modality-id1>", "<modality-id2>"],
    "variableIds": []
  }
}
```

### ValueField Filters (By Value)

Filter rows/columns based on Metric values (e.g., "show only products where Revenue > 1000").

CRITICAL REQUIREMENT: When there are pivots on the opposite axis from the filtered pivot, you MUST provide projections for each of those pivots.

Why projections are needed:

- When filtering rows by value, but columns exist, you need to specify WHICH column value to use for comparison
- Example: If filtering "Product" rows by "Revenue > 1000" and "Month" is in columns, you must specify which month (e.g., "January 2024") to use for the comparison
- Without valid projections, the filter will be silently removed during View creation

Configuration:

```json
{
  "type": "ValueField",
  "valueFieldFilteringOption": {
    "pivotFieldId": "<pivot-field-id-being-filtered>", // Must be innermost pivot on its axis
    "valueFieldId": "<value-field-id>",
    "compareOperator": "Gt",
    "values": ["1000"],
    "variableIds": [],
    "projections": [
      // REQUIRED if opposite axis has pivots
      {
        "pivotFieldId": "<opposite-axis-pivot-id>",
        "modalityId": "<modality-id>" // Which modality to use for comparison
      }
    ]
  }
}
```

Example scenario:

- Rows: Product Dimension
- Columns: Month Dimension
- Want to filter: "Show only products where Quantity Sold > 100"
- You MUST specify which month to use for comparison (e.g., the first month modality)

### PivotListProperty Filters

Filter based on List Property values.

Configuration:

```json
{
  "type": "PivotListProperty",
  "pivotListPropertyFilteringOption": {
    "pivotFieldId": "<pivot-field-id>", // MUST be from rows or columns, NOT pages!
    "listPropertyPath": ["propertyName"],
    "compareOperator": "Eq",
    "values": ["value"],
    "variableIds": []
  }
}
```

Example - Filtering by Product Name:

If you want to filter to show only "Choco Bites" product:

1. Ensure the Product Dimension appears in rows or columns (not just pages)
2. Use the pivotFieldId from that row/column pivot (e.g., from the columns array)
3. Use the Property name (typically `"_name_XXXXXX"` where XXXXXX is a suffix)

```json
{
  "type": "PivotListProperty",
  "pivotListPropertyFilteringOption": {
    "pivotFieldId": "da327057-0d83-4ef4-9ec6-ba3934f6ce5f", // From columns array
    "listPropertyPath": ["_name_D81JNJ"],
    "compareOperator": "Eq",
    "values": ["Choco Bites"],
    "variableIds": []
  }
}
```
