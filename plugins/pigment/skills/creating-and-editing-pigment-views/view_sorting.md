# Sorting

UI: order of rows/columns (and chart categories). Tool payloads use `pivotFieldId` and `sorts` (same pivot list as filters).

Sorts are applied after creation via `tool:update_view_sorts`, using pivot ids from the `tool:create_view` response.

Sorting controls how data is ordered in the View. It applies to both Grid and Chart display (e.g., bar order in a bar chart). Multiple sorting options can be applied, with the first option having the highest priority.

### Types of Sorting

There are two types of sorting options:

### 1. Sort by Property (ByProperty)

Sorts data based on a Property value of a Dimension (e.g., sort by Name, Code, or any other Dimension Property).

When to use:

- Sorting List items alphabetically by name
- Sorting by a Dimension Property like "Code" or "Category"
- Ordering data by manual Dimension order (when `property_friendly_name` is null)

Configuration:

```python
PydanticSortingOption(
    order=Order.Asc,  # or Order.Desc
    type=SortingOptionType.ByProperty,
    by_property_sorting_option=PydanticByPropertySortingOption(
        pivot_field_id="<pivot-field-id>",  # The pivot field to sort
        property_friendly_name="Name",       # Friendly name of property to sort by (or None for manual order)
    ),
)
```

Example use cases:

- Sort products alphabetically by product name
- Sort employees by employee code
- Sort departments by a custom "Priority" Property

### 2. Sort by Metric Value (ByMetricValue)

Sorts data based on Metric values (e.g., sort products by their revenue).

When to use:

- Sorting by calculated values (revenue, cost, profit, etc.)
- Ranking items by performance Metrics
- Ordering data by aggregated values

Configuration:

```python
PydanticSortingOption(
    order=Order.Desc,  # or Order.Asc
    type=SortingOptionType.ByMetricValue,
    by_metric_value_sorting_option=PydanticByMetricValueSortingOption(
        pivot_field_id="<pivot-field-id>",      # The pivot whose modalities are sorted
        value_field_id="<value-field-id>",      # The metric to sort by
        projections=[                            # Define which modality to use for sorting
            PydanticSingleModalityProjection(
                pivot_field_id="<other-pivot-field-id>",
                modality_id="<modality-id>",     # Can be None for null modality
            )
        ],
        subtotal_pivot_field_ids=None,          # Optional: for sorting on subtotals
    ),
)
```

Important notes about projections:

- Projections specify which specific modality to use when sorting by Metric values
- All pivot fields on the opposite axis must be either projected or included in subtotals
- For example, if sorting rows by a Metric, all column pivot fields must be projected
- Each projection selects a specific modality (or null modality) for a pivot field

Example use cases:

- Sort products by total revenue (descending)
- Sort regions by sales performance
- Rank employees by their productivity Metrics

### Multiple Sorting Options

You can apply multiple sorting options to a View. They are applied in order, with the first option having the highest priority.

Example:

```python
sorts=[
    # Primary sort: by category (ascending)
    PydanticSortingOption(
        order=Order.Asc,
        type=SortingOptionType.ByProperty,
        by_property_sorting_option=PydanticByPropertySortingOption(
            pivot_field_id=category_pivot_id,
            property_friendly_name="Name",  # Friendly name
        ),
    ),
    # Secondary sort: by revenue (descending)
    PydanticSortingOption(
        order=Order.Desc,
        type=SortingOptionType.ByMetricValue,
        by_metric_value_sorting_option=PydanticByMetricValueSortingOption(
            pivot_field_id=product_pivot_id,
            value_field_id=revenue_value_field_id,
            projections=[...],
        ),
    ),
]
```

This would first sort by category name (A-Z), then within each category, sort products by revenue (highest to lowest).

### Common Sorting Patterns

1. Alphabetical sorting of List items:
   - Use `ByProperty` with `property_friendly_name="Name"` (friendly name)
   - Order: `Asc` for A-Z, `Desc` for Z-A

2. Top N analysis (e.g., top 10 products by revenue):
   - Use `ByMetricValue` with `order=Order.Desc`
   - Combine with filters to limit to top N items

3. Time-based sorting:
   - Use `ByProperty` with the time Dimension's natural order
   - Set `property_friendly_name=None` to use manual/natural order

4. Multi-level sorting:
   - Apply multiple sorting options in priority order
   - First sort establishes primary grouping, subsequent sorts refine within groups
