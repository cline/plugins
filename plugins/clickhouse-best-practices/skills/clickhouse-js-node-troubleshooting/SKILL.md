---
name: clickhouse-js-node-troubleshooting
description: Troubleshoot the ClickHouse Node.js client in Node runtimes. Use for @clickhouse/client connection drops, socket hang up errors, TLS or proxy issues, query parameters, inserts, streaming, compression, read-only users, and timeout behavior. Do not use for browser, Workers, Edge, or @clickhouse/client-web issues.
license: MIT
metadata:
  author: ClickHouse Inc
  adapted_from: ClickHouse Agent Skills
---

# ClickHouse Node.js Troubleshooting

Diagnose `@clickhouse/client` issues from symptoms, configuration, error messages, and minimal code snippets. Protect secrets and prefer small, reversible checks.

Use this skill only for Node.js runtimes. For browser, Workers, Edge, or `@clickhouse/client-web`, say that the runtime has different constraints and avoid applying Node transport assumptions.

## Safety

- Do not ask for full connection strings, passwords, tokens, certificates, or private keys.
- Ask users to redact hosts, usernames, database names, query text, and payload samples when needed.
- Do not suggest production-impacting changes without calling out blast radius and rollback.

## Triage

Collect:

- Client package name and version.
- Runtime: Node.js version, serverless/container/local environment, proxy or load balancer path.
- Transport: HTTP or HTTPS, TLS settings, compression, keep-alive, request timeout.
- Operation: select, insert, stream, ping, query parameters, session, or long-running query.
- Exact error class and where it occurs.
- Whether the same query works in `clickhouse-client` or another known-good path.

## Common Patterns

- `socket hang up` or `ECONNRESET`: check keep-alive reuse, proxy idle timeout, serverless execution limits, request body size, and long-running query timeout.
- TLS failures: verify CA handling, hostname validation, corporate proxy behavior, and whether the endpoint requires HTTPS.
- Proxy path issues: confirm that custom pathnames are preserved and not double-prefixed.
- Insert failures: verify format, column order, JSONEachRow shape, required columns, compression, and payload size.
- Streaming issues: consume streams fully, attach error handlers, avoid buffering huge responses, and close resources.
- Query parameter issues: use client-supported parameter binding instead of string interpolation.
- Read-only user errors: separate permission failures from SQL syntax and route writes through an allowed role.
- Data type surprises: check DateTime64 precision, Decimal handling, UUID strings, arrays, maps, and nullable values.

## Response Shape

```md
Likely cause:
- [ranked hypothesis]

Evidence:
- [what in the error/config/code points there]

Safe checks:
- [small check that avoids exposing secrets]

Fix:
- [specific client/config/code change]

Still needed:
- [minimal missing detail]
```
