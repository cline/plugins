---
name: clickhouse-best-practices
description: Review ClickHouse schemas, SQL, ingestion plans, materialized views, and performance choices. Use for CREATE TABLE design, ORDER BY keys, partitions, data types, joins, inserts, updates, deletes, slow queries, or ClickHouse-specific query review.
license: Apache-2.0
metadata:
  author: ClickHouse Inc
  adapted_from: ClickHouse Agent Skills
---

# ClickHouse Best Practices

Use ClickHouse-specific judgment when reviewing database design or SQL. Columnar MergeTree behavior, sort keys, background merges, and analytical access patterns matter more than row-store intuition.

## Safety

- Do not ask users to paste passwords, OAuth tokens, API keys, private keys, or full connection strings.
- Treat schemas, logs, query text, query results, object names, cloud URLs, and billing or service metadata as sensitive project data.
- For exploratory SQL, prefer read-only SELECT queries with explicit `LIMIT`, narrow filters, and small time ranges.
- Prefer metadata and schema checks before SQL. Do not treat `LIMIT` as a cost guard for broad aggregates, joins, or scans because ClickHouse may still need to read substantial data before limiting output.
- Ask before recommending broad scans, expensive group-bys, export-like outputs, destructive DDL, mutations, or production configuration changes.

## Schema Review

- Choose `ORDER BY` before table creation; changing it later usually requires a table rebuild.
- Put frequently filtered, lower-cardinality dimensions earlier in `ORDER BY`, then more granular columns.
- Align the sort key with the highest-value query patterns, not every possible filter.
- Prefer native types over storing everything as `String`.
- Use the smallest numeric type that safely fits the domain.
- Use `LowCardinality(String)` for repeated strings with bounded cardinality.
- Avoid `Nullable` where a default value clearly represents missing data.
- Keep partition cardinality bounded. Partition mostly for lifecycle management and data movement, not routine query speed.
- Start without partitioning unless retention, backfills, or data-management requirements justify it.

## Query Review

- Filter on the `ORDER BY` prefix whenever possible.
- Filter large tables before joins.
- Use `ANY JOIN` when only one match is needed.
- Consider dictionaries, denormalization, projections, or materialized views before adding frequent large joins.
- Avoid null-heavy join keys and clarify semantics for missing values.
- Use skipping indexes only for selective predicates not covered by the sort key; validate with real query patterns.
- Use `EXPLAIN`, small bounded queries, or system tables to verify assumptions before recommending major changes.

## Ingestion And Mutations

- Batch inserts around 10,000 to 100,000 rows when practical.
- Use async inserts for high-frequency small inserts.
- Prefer native or efficient columnar formats for bulk loading.
- Avoid frequent `ALTER TABLE UPDATE`; model update patterns with engines such as `ReplacingMergeTree` when appropriate.
- Avoid frequent large deletes; prefer partition drops, retention policies, or lightweight deletes when appropriate.
- Avoid routine `OPTIMIZE TABLE ... FINAL`; let background merges work unless there is a specific operational reason.

## Materialized Views

- Use incremental materialized views for real-time aggregations over append-heavy streams.
- Use refreshable materialized views when the query depends on complex joins or full recomputation.
- Match the target table key to the serving query pattern.
- Document freshness expectations, backfill behavior, and failure recovery.

## Response Shape

For reviews, answer with:

```md
Rules checked:
- [area] - [pass/fail/needs evidence]

Findings:
- [specific issue, why it matters in ClickHouse, concrete fix]

Open questions:
- [missing workload, schema, volume, retention, or query detail]
```

If evidence is missing, say what to inspect next instead of guessing.
