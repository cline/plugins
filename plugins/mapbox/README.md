# mapbox

Adds Mapbox MCP tools and application-development skills for building location-aware web, iOS, Android, and Flutter applications in Cline.

## What It Does

The plugin registers three remote MCP servers:

- `mapbox` for live geospatial tools such as search, geocoding, routing, isochrones, spatial calculations, and location grounding.
- `mapbox-devkit` for Mapbox development workflows such as style management, style validation, optimization, previews, and token-management support.
- `mapbox-docs` for Mapbox documentation lookup.

It also bundles Mapbox skills for:

- Web, iOS, Android, and Flutter integration patterns.
- Search, store locator, geospatial operation, and location-grounding workflows.
- Cartography, style patterns, style quality, data visualization, and web performance.
- Google Maps and MapLibre migration.
- Mapbox MCP runtime and DevKit integration.
- Token security and rotation guidance.

## Install

```bash
cline plugin install mapbox
```

For local development from this repository:

```bash
cline plugin install ./plugins/mapbox --cwd .
```

## Requirements

- A Mapbox account.
- MCP authorization when Cline first connects to the Mapbox servers.
- Public Mapbox access tokens for client-side web or mobile map rendering.
- Secret Mapbox tokens only for server-side, CI, or administrative workflows that require elevated scopes.

## Security Notes

Do not expose `sk.*` secret tokens in browser code, mobile app bundles, logs, screenshots, or generated examples. Public `pk.*` tokens should be scoped and URL-restricted where possible. Ask before large geocoding, routing, style-management, or token-management operations that could affect billing, production applications, or account security.
