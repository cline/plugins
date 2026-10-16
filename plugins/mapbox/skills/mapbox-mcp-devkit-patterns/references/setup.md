# Cline Setup

This Cline plugin registers the remote Mapbox DevKit MCP server automatically:

```text
mapbox-devkit -> https://mcp-devkit.mapbox.com/mcp
```

Users should not add a duplicate manual MCP settings entry for the same server. After installing the plugin, authorize the `mapbox-devkit` MCP server from Cline's MCP flow when prompted.

## Requirements

- Mapbox account.
- MCP authorization for `mapbox-devkit`.
- Secret tokens only for server-side, CI, or administrative tasks that explicitly need elevated scopes.

## When to Use DevKit

Use `mapbox-devkit` tools for development and account workflows:

- Style creation and updates.
- Style validation, expression validation, and GeoJSON validation.
- Style previews, optimization, and comparison.
- Token listing and scoped token creation.
- Documentation lookup through the companion `mapbox-docs` server.

## Verify Availability

Ask Cline to list available Mapbox tools or use one of the skills that names the exact tool. Expected tools include:

- Style tools: `mapbox-devkit__create_style_tool`, `mapbox-devkit__list_styles_tool`, `mapbox-devkit__update_style_tool`, `mapbox-devkit__delete_style_tool`, `mapbox-devkit__preview_style_tool`.
- Token tools: `mapbox-devkit__create_token_tool`, `mapbox-devkit__list_tokens_tool`.
- Validation tools: `mapbox-devkit__validate_geojson_tool`, `mapbox-devkit__validate_style_tool`, `mapbox-devkit__validate_expression_tool`.
- Geographic tools from the main Mapbox server: `mapbox__bbox_tool`, `mapbox__coordinate_conversion_tool`, `mapbox__tilequery_tool`.
- Documentation: `mapbox-docs__get_latest_mapbox_docs_tool`.
