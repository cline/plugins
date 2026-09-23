# Scoring System for View Selection

Use this when evaluating multiple Views and the best choice isn't obvious from the criteria in [relevant_views.md](./relevant_views.md).

## Scoring Table

| Criterion                   | Weight  | Score Range | How to score                                                                                                                                                               |
| --------------------------- | ------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pivot Configuration         | HIGHEST | 0-10        | 10=Perfect match, 8-9=Close (swap dims, remove 1 pivot), 6-7=Moderate edits (add/remove multiple pivots), 4-5=Partial (change Dimensions), 0-3=Poor (completely different) |
| Configuration Compatibility | HIGH    | 0-5         | 5=Perfect for intended display mode, 3-4=Compatible with minor edits, 1-2=Moderate restructuring, 0=Incompatible                                                           |
| Board Usage                 | MEDIUM  | 0-5         | 5=5+ Boards, 3=2-4 Boards, 1=1 Board, 0=no Boards                                                                                                                          |
| Recent Updates              | MEDIUM  | 0-5         | 5=last 30 days, 3=last 3 months, 1=last 6 months, 0=over 1 year                                                                                                            |
| Formatting & Customization  | MEDIUM  | 0-3         | 3=Heavy formatting, 2=Some, 1=Minimal, 0=None                                                                                                                              |
| Name/Description            | LOW     | 0-2         | 2=Clear and matches intent, 1=Somewhat clear, 0=Unclear or misleading                                                                                                      |

## Configuration Compatibility Details

- KPI intent + no pivots -> 5 points
- KPI intent + 1 pivot to remove -> 3-4 points
- Grid intent + good row/column setup -> 5 points
- Grid intent + KPI View (need to add pivots) -> 3-4 points
- Chart intent + chartConfig + 1-2 Dimensions -> 5 points
- Chart intent + >2 pivots (need trimming) -> 3 points

## How to Use

1. Score each candidate View across all criteria
2. A total score of 20+ indicates a strong candidate
3. Pivot Configuration dominates - a View scoring 8+ on pivots with low scores elsewhere is usually better than a View scoring 5 on pivots with high scores elsewhere
4. Select the highest-scoring View whose editing effort is acceptable

## Worked Example

Intent: Revenue KPI, no breakdowns

| View                                               | Pivot (0-10) | Compat (0-5) | Usage (0-5) | Recency (0-5) | Formatting (0-3) | Name (0-2) | Total |
| -------------------------------------------------- | ------------ | ------------ | ----------- | ------------- | ---------------- | ---------- | ----- |
| Revenue KPI (no pivots, 8 boards, 15d ago)         | 10           | 5            | 5           | 5             | 1                | 2          | 28    |
| Revenue by Region (Rows=Region, 6 boards, 10d ago) | 8            | 4            | 5           | 5             | 1                | 1          | 24    |
| Total Revenue (no pivots, 0 boards, 6mo ago)       | 10           | 5            | 0           | 1             | 0                | 1          | 17    |

"Revenue KPI" wins clearly. "Revenue by Region" is a solid fallback despite needing a pivot edit - its high usage and recency compensate. "Total Revenue" scores poorly on usage and recency, suggesting it may be abandoned.
