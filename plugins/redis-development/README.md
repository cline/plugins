# redis-development

Use Redis development guidance in Cline for data modeling, connection tuning, Query Engine indexes, vector search, semantic caching, clustering, security, observability, and Redis AI product workflows.

## What It Adds

The plugin bundles Redis workflow skills for:

- Choosing Redis data structures and key naming conventions.
- Designing Redis Query Engine indexes and search queries.
- Building vector search and RAG retrieval flows.
- Tuning client connections, pooling, pipelining, timeouts, and client-side caching.
- Planning cluster hash tags, multi-key operations, and replica reads.
- Hardening authentication, ACLs, TLS, network exposure, and dangerous commands.
- Monitoring Redis health with INFO, SLOWLOG, MEMORY, CLIENT, and FT.PROFILE guidance.
- Using Redis LangCache and Redis Agent Memory services.

## Install

```bash
cline plugin install redis-development
```

For local development from this repository:

```bash
cline plugin install ./plugins/redis-development --cwd .
```

## Example Usage

Ask Cline to design a Redis key model for a cache-heavy feature, review a Redis Query Engine index, troubleshoot connection pool exhaustion, plan Redis Cluster hash tags, or harden ACL/TLS/network settings before production.

## Requirements

No external runtime is required to install the plugin. Some workflows may ask the user to run Redis CLI commands, Redis client libraries, Redis Insight, Redis Cloud setup steps, or SDK examples depending on the user's project and task.

## Safety Notes

The bundled skills include live Redis safety guidance: confirm the target environment and ask before destructive, broad, blocking, administrative, credential-changing, SDK/REST write, delete, bulk-read, or production smoke-test operations.

The plugin does not connect to Redis or start local services at install time. It is an offline skill pack with safety guidance inside the skills.

## License

The bundled Redis workflow skills are adapted from Redis agent skill material under the MIT license. See `NOTICE.redis-agent-skills`.
