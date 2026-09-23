---
name: chdb-datastore
description: Use chDB DataStore for pandas-style local and cross-source analytics. Use when speeding up pandas-like workflows, filtering or joining DataFrames, reading parquet/CSV/JSON/Arrow, or joining data from MySQL, PostgreSQL, S3, MongoDB, ClickHouse Cloud, Iceberg, or Delta Lake.
license: Apache-2.0
metadata:
  author: chdb-io
  adapted_from: ClickHouse Agent Skills
---

# chDB DataStore

Help users use chDB DataStore as a pandas-compatible analytical layer backed by ClickHouse.

## When To Use

- The user has pandas-style code that is slow or memory-heavy.
- The user wants DataFrame-like filtering, grouping, aggregation, or joins.
- The user wants to query parquet, CSV, JSON, Arrow, object storage, or remote databases as DataFrames.
- The user wants cross-source joins without building a full pipeline first.

Use `chdb-sql` instead when the user primarily wants raw SQL examples or ClickHouse table functions.

## Safety

- Treat file paths, bucket URLs, connection details, schemas, sample rows, and query outputs as sensitive.
- Do not ask users to paste passwords, tokens, or full connection strings.
- Ask before suggesting installation, scanning large private datasets, or joining/exporting data across systems.

## Migration Guidance

- Identify the current pandas bottleneck: file read, group-by, join, memory pressure, or repeated transformations.
- Keep the first rewrite small and behavior-preserving.
- Push filters, projections, and joins into chDB rather than materializing full intermediate DataFrames.
- Validate row counts, null handling, numeric precision, timestamps, and ordering assumptions.
- For cross-source joins, clarify which system owns the data and whether local materialization is acceptable.
- Preserve readable pandas-like code where performance is already adequate.

## Response Shape

```md
Use DataStore when:
- [why this workload fits]

Minimal rewrite:
- Provide a compact, redacted Python snippet.

Validation:
- [checks against the old pandas result]

Caveats:
- [memory, credentials, source access, or semantics]
```
