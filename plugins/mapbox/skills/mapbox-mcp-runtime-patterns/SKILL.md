---
name: mapbox-mcp-runtime-patterns
description: Integration patterns for Mapbox MCP Server in AI applications and agent frameworks. Covers runtime integration with pydantic-ai, mastra, LangChain, and custom agents. Use when building AI-powered applications that need geospatial capabilities.
---

# Mapbox MCP Runtime Patterns

This skill provides patterns for integrating the Mapbox MCP Server into AI applications for production use with geospatial capabilities.

## What is Mapbox MCP Server?

The [Mapbox MCP Server](https://github.com/mapbox/mcp-server) is a Model Context Protocol (MCP) server that provides AI agents with geospatial tools:

Offline Tools (Turf.js):

- Distance, bearing, midpoint calculations
- Point-in-polygon tests
- Area, buffer, centroid operations
- Bounding box, geometry simplification
- No API calls, instant results

Mapbox API Tools:

- Directions and routing
- Reverse geocoding
- POI category search
- Isochrones (reachability)
- Travel time matrices
- Static map images
- GPS trace map matching
- Multi-stop route optimization

Utility Tools:

- Server version info
- POI category list

Key benefit: Give your AI application geospatial superpowers without manually integrating multiple APIs.

## Understanding Tool Categories

Before integrating, understand the key distinctions between tools to help your LLM choose correctly:

### Distance: "As the Crow Flies" vs "Along Roads"

Straight-line distance (offline, instant):

- Tools: `mapbox__distance_tool`, `mapbox__bearing_tool`, `mapbox__midpoint_tool`
- Use for: Proximity checks, "how far away is X?", comparing distances
- Example: "Is this restaurant within 2 miles?" → `mapbox__distance_tool`

Route distance (API, traffic-aware):

- Tools: `mapbox__directions_tool`, `mapbox__matrix_tool`
- Use for: Navigation, drive time, "how long to drive?"
- Example: "How long to drive there?" → `mapbox__directions_tool`

### Search: Type vs Specific Place

Category/type search:

- Tool: `mapbox__category_search_tool`
- Use for: "Find coffee shops", "restaurants nearby", browsing by type
- Example: "What hotels are near me?" → `mapbox__category_search_tool`

Specific place/address:

- Tool: `mapbox__search_and_geocode_tool`, `mapbox__reverse_geocode_tool`
- Use for: Named places, street addresses, landmarks
- Example: "Find 123 Main Street" → `mapbox__search_and_geocode_tool`

### Travel Time: Area vs Route

Reachable area (what's within reach):

- Tool: `mapbox__isochrone_tool`
- Returns: GeoJSON polygon of everywhere reachable
- Example: "What can I reach in 15 minutes?" → `mapbox__isochrone_tool`

Specific route (how to get there):

- Tool: `mapbox__directions_tool`
- Returns: Turn-by-turn directions to one destination
- Example: "How do I get to the airport?" → `mapbox__directions_tool`

### Cost & Performance

Offline tools (free, instant):

- No API calls, no token usage
- Use whenever real-time data not needed
- Examples: `mapbox__distance_tool`, `mapbox__point_in_polygon_tool`, `mapbox__area_tool`

API tools (requires token, counts against usage):

- Real-time traffic, live POI data, current conditions
- Use when accuracy and freshness matter
- Examples: `mapbox__directions_tool`, `mapbox__category_search_tool`, `mapbox__isochrone_tool`

Best practice: Prefer offline tools when possible, use API tools when you need real-time data or routing.

## Cline Setup

This Cline plugin registers the remote Mapbox MCP server automatically:

```
https://mcp.mapbox.com/mcp
```

Users should not add a duplicate manual MCP settings entry for the same server. After installing the plugin, authorize the `mapbox` MCP server from Cline's MCP flow when prompted.

Benefits:

- No server management
- Always up-to-date
- Production-ready
- Lower latency (Mapbox infrastructure)

For application code outside Cline, direct Mapbox APIs or self-hosted MCP deployments may still use token-based authentication. Keep those tokens out of client-side code unless they are public `pk.*` tokens with appropriate restrictions.

## Reference Files

Detailed integration patterns and production guidance are organized into reference files. Load the ones relevant to your task.

- Pydantic AI -- Type-safe Python agents
  Load: `references/pydantic-ai.md`

- CrewAI -- Multi-agent orchestration
  Load: `references/crewai.md`

- Smolagents -- Lightweight HuggingFace agents
  Load: `references/smolagents.md`

- Mastra -- Multi-agent TypeScript systems
  Load: `references/mastra.md`

- LangChain -- Conversational AI with tool chaining
  Load: `references/langchain.md`

- Custom Agent -- Zillow/TripAdvisor/DoorDash-style patterns, architecture diagrams, hybrid approach
  Load: `references/custom-agent.md`

- Use Cases -- Real Estate, Food Delivery, Travel Planning examples
  Load: `references/use-cases.md`

- Production Patterns -- Caching, batch operations, tool descriptions, error handling, security, rate limiting, testing
  Load: `references/production.md`

- Runnable examples -- Pydantic AI, CrewAI, Smolagents, Mastra, and LangChain examples
  Load: `examples/README.md`

## Resources

- [Mapbox MCP Server](https://github.com/mapbox/mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Pydantic AI](https://ai.pydantic.dev/)
- [Mastra](https://mastra.ai/)
- [LangChain](https://docs.langchain.com/oss/javascript/langchain/overview/)
- [Mapbox API Documentation](https://docs.mapbox.com/api/)

## When to Use This Skill

Invoke this skill when:

- Integrating Mapbox MCP Server into AI applications
- Building AI agents with geospatial capabilities
- Architecting Zillow/TripAdvisor/DoorDash-style apps with AI
- Choosing between MCP, direct APIs, or SDKs
- Optimizing geospatial operations in production
- Implementing error handling for geospatial AI features
- Testing AI applications with geospatial tools
