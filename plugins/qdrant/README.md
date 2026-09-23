# qdrant

Qdrant vector search guidance for Cline. This plugin bundles skills for designing, tuning, operating, and migrating Qdrant-backed search systems.

## Cline Primitives

- Bundled skills for Qdrant SDK usage, deployment options, scaling, performance optimization, monitoring, search quality, embedding model migration, and version upgrades.

The bundled skills treat live Qdrant collection, index, sharding, replica, migration, upgrade, and scaling changes as production database operations that need explicit user confirmation.

## Requirements

- No API keys are required to install the plugin.
- The skills can be used offline, but many of their references point to Qdrant documentation for deeper follow-up.
- The plugin does not start Qdrant, install SDKs, register MCP servers, or mutate clusters during installation.

## Third-Party Notice

The bundled Qdrant skill content is adapted for Cline from Qdrant skill material licensed under Apache License 2.0 by Qdrant Solutions GmbH. See `LICENSE.qdrant-skills` and `NOTICE.qdrant-skills`.
