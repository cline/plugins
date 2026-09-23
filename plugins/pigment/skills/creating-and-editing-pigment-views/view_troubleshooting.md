# Troubleshooting

## View Creation Fails (Pivot Fields)

Symptoms:

- Error: "Dimension ID not found"
- Error: "Invalid pivot field configuration"
- Pivot field is silently removed during View creation

Solutions:

1. Verify Dimension IDs exist in the application
2. Check that Dimension is actually a Dimension of the underlying Metric/List
3. Ensure pivot field kind matches (Dimension vs Scenario)
4. For Grouping pivots with `listPropertyPath`:
   - Verify the source Dimension exists in the List cache
   - Check that each Property in the path exists on the respective Dimensions
   - Ensure the List Property path uses friendly names (the display names shown to users)
   - Verify the Dimension is part of the allowed Dimensions (determined by Metrics in valueFields)

## Filters Are Being Removed (Silently Sanitized)

Symptoms:

- Filter was sent to `tool:update_view_filters` but is missing from the updated View
- Filter appears to be ignored
- No error message, but the filter just doesn't appear

Root Cause:
The filter failed validation during view sanitization and was removed. This happens when:

1. Wrong pivotFieldId source (MOST COMMON): The `pivotFieldId` in the filter references a pivot from the pages array instead of from rows/columns.
   - Why it fails: Filters are only validated against `DimensionalPivotFields`, which only includes pivots from rows and columns
   - How to fix: Always use a pivotFieldId from the rows or columns arrays, never from pages
   - Example: If filtering on Product Dimension, ensure Product is in rows or columns, then use that pivot's ID

2. Missing projections for ValueField filters: If filtering on a pivot in one axis (e.g., rows) and there are pivots on the opposite axis (e.g., columns), you MUST provide projections for each opposite-axis pivot.

3. Invalid pivot reference: The `pivotFieldId` doesn't reference the innermost pivot on its axis.

4. Invalid value field reference: The `valueFieldId` doesn't exist in the View's value fields.

5. Invalid comparison operator: The operator doesn't match the Metric type (e.g., using "Contains" on a numeric Metric).

6. Invalid List Property path: For PivotListProperty filters, the Property path doesn't exist on the Dimension.

Solutions:

1. CRITICAL: Always use pivotFieldId from rows or columns, NEVER from pages:
   - Check that the Dimension you want to filter on appears in rows or columns
   - If it only appears in pages, you need to add it to rows or columns first
   - Use the pivotFieldId from that row/column entry

2. Always provide projections for ValueField filters when the opposite axis has pivots:

   ```json
   "projections": [
     {
       "pivotFieldId": "<column-pivot-id>",
       "modalityId": "<first-modality-of-that-dimension>"
     }
   ]
   ```

3. Use the GetBlockViews tool to inspect an existing similar view to see how filters are structured

4. Verify all IDs refer to an existing pivot and the pivots exist in rows/columns (not pages!)

## View Shows No Data

Symptoms:

- View created but displays empty

Solutions:

1. Check filters - may be filtering out all data
2. Verify underlying Metric/List has data
3. Check `show_empty_rows` and `show_empty_columns` settings
4. Ensure value fields are set to `displayed: true`

## Performance Issues

Symptoms:

- View takes a long time to load
- Browser becomes unresponsive

Solutions:

1. Add more aggressive filters to reduce data volume
2. Reduce number of breakdowns
3. Set `show_empty_rows: false` and `show_empty_columns: false`
4. Use pages with `single_modality: true` to limit data
