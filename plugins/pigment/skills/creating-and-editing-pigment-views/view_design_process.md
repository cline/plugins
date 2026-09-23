# View Design Process

## Step 1: Define your ideal View

Before any lookup, be clear on:

1. Data (which Metric, List, or Table?)
2. Breakdown (which Dimensions in Pages, Rows, Columns - and for Table, where metrics sit)
3. View filtering and sorting

Use [view_components.md](./view_components.md), [view_filtering.md](./view_filtering.md), [view_sorting.md](./view_sorting.md). [view_display_modes.md](./view_display_modes.md) for `display_type` / block rules.

## Step 2: Optional scan of existing Views

Call `tool:get_block_views` on the block (use `display_intent` when the tool allows). Read [relevant_views.md](../designing-pigment-boards/relevant_views.md) for how to read results - this is a light pass, not a hard prerequisite.

Names first: e.g. "View 1" -> very likely a not nicely formatted re-usable view. Unless its pivots already match this widget and is consistent with the rest of the board, prefer `tool:create_view` with a real name and coherent layout. Meaningful names (e.g. _Revenue by Region - Monthly_) are a strong reuse signal.

## Step 3: Reuse, or create

- Strong name + pivot fit (including board-wide pages and story) -> reuse; wire the widget to that View.
- Otherwise -> `tool:create_view`, then iterate with `tool:update_view_pivots` (placement, calculated items, custom display, styling, aggregations) and the other `update_view_*` tools (filters, sorts, chart config, ...). When `tool:create_view` is called with `pivotLayout` null, the server picks a sensible default layout; to override, send a complete `pivotLayout` with all three axes populated (empty array = no pivot on that axis). Editing the live View behind a board widget -> call the matching `update_view_*` tool directly on that View id - if a Draft was created, pair the edit with `tool:update_view_widget_overrides` so this user sees the Draft on the widget (see [view_widgets.md](../designing-pigment-boards/view_widgets.md)).

Templates (Grid only): If `tool:get_all_view_templates` exists, after a new View in Grid mode, pick and apply a template silently when one clearly fits; else skip.

## Step 4: Validate

After create/update, the response should match what you sent; dropped fields may mean sanitization. Before wiring a widget, confirm `display_type` and block rules ([view_display_modes.md](./view_display_modes.md), [view_widgets.md](../designing-pigment-boards/view_widgets.md)). On errors, [view_troubleshooting.md](./view_troubleshooting.md).
