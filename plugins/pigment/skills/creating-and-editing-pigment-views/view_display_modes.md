# Display Modes

The widget sets `display_type` (KPI / Grid / Chart). The View may hold chart config for graph types; no chart config in the View -> typical grid behavior.

Chart config is applied after creation via `tool:update_view_chart_config`, using pivot ids from  `tool:create_view` response, `tool:get_view` response or others.

- KPI: No row pivots. `metricsLocation` MUST NOT be `Rows` (use `Columns` or `Pages`). Not for List blocks.
- Grid (Table / List): Tabular. Only mode for List blocks.
- Chart: Chart kind lives on the View; not for List blocks.
