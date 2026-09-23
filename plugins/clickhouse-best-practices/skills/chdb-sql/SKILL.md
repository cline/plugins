---
name: chdb-sql
description: Use embedded ClickHouse SQL from Python with chDB. Use when querying parquet, CSV, JSON, local files, URLs, S3, MySQL, PostgreSQL, MongoDB, Iceberg, Delta Lake, or ClickHouse sources without running a separate server.
license: Apache-2.0
metadata:
  author: chdb-io
  adapted_from: ClickHouse Agent Skills
---

# chDB SQL

Help users use chDB as embedded ClickHouse SQL from Python for local files, object storage, and remote analytical sources.

## When To Use

- The user wants SQL over local parquet, CSV, JSON, Arrow, or log files.
- The user wants quick analytical exploration without a separate ClickHouse server.
- The user wants stateful multi-step local analysis with a Python process.
- The user needs ClickHouse functions, table functions, or cross-source joins from Python.

Do not use this skill for general ClickHouse server administration or pandas-style DataFrame API work; use `chdb-datastore` for DataFrame-like workflows.

## Safety

- Treat local file paths, URLs, object storage paths, credentials, and query outputs as sensitive.
- Do not ask users to paste secrets. Prefer environment variables, local profiles, or existing project configuration.
- Ask before suggesting installation, large scans, cross-source exports, or queries over private buckets and production databases.

## Guidance

- Start with a tiny query that proves the file or source is readable.
- Use explicit file formats where inference may be ambiguous.
- Use `Session` when the workflow needs temporary tables, repeated queries, or shared state.
- Prefer parameterized queries for user-supplied values.
- Keep memory limits and local disk constraints in mind for large files.
- Push filters and projections into the SQL instead of loading full datasets into Python first.
- For remote sources, clarify network access, credentials, and whether data movement is acceptable.

## Response Shape

```md
Approach:
- [chDB query/session pattern]

Example:
- Provide a compact, redacted Python snippet.

Notes:
- [format, performance, safety, or credential caveat]
```

Keep examples minimal and avoid fabricating schema details.
