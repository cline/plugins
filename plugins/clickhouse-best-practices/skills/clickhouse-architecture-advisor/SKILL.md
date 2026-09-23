---
name: clickhouse-architecture-advisor
description: Design ClickHouse architectures from workload requirements. Use when choosing ingestion strategies, time-series partitioning, real-time pre-aggregation, enrichment patterns, mutable-state handling, or production topology.
license: Apache-2.0
metadata:
  author: ClickHouse Inc
  adapted_from: ClickHouse Agent Skills
---

# ClickHouse Architecture Advisor

Turn workload requirements into ClickHouse architecture recommendations. Prefer explicit tradeoffs over one-size-fits-all guidance.

## Inputs To Gather

- Data sources, formats, and expected ingest rate.
- Latency targets for ingestion and queries.
- Retention, backfill, replay, and deletion requirements.
- Query shapes, filters, joins, aggregations, concurrency, and freshness needs.
- Expected data volume, cardinality, and skew.
- Operational constraints: cloud, self-managed, local development, compliance, budget, and team experience.

## Decision Areas

### Ingestion

- Use direct batched inserts for simple application writes.
- Use queues or streaming pipelines when durability, buffering, replay, or fan-out matters.
- Use ClickPipes or managed connectors when the source is supported and operational simplicity is more important than custom control.
- Use object storage landing zones for bulk historical loads and replayable pipelines.

### Time Series

- Use the sort key for common time-bounded filters plus high-value dimensions.
- Keep partitions coarse enough to avoid too many parts.
- Model retention with TTLs or partition drops where possible.
- Separate hot and historical access patterns when they need different layouts.

### Joins And Enrichment

- Prefer denormalization when enrichment is stable and heavily queried.
- Use dictionaries for fast key-value lookups.
- Use materialized views for repeated derived tables.
- Keep runtime joins for smaller dimensions, ad hoc exploration, or cases where freshness outweighs query cost.

### Mutable Data

- Avoid row-by-row updates as the default design.
- Consider `ReplacingMergeTree`, `CollapsingMergeTree`, or versioned append patterns for late-arriving changes.
- Make query-time deduplication costs explicit.
- Define reconciliation and backfill strategy before production.

### Pre-Aggregation

- Use incremental materialized views for stable real-time rollups.
- Use refreshable materialized views for complex joins or recomputation-heavy transformations.
- Keep raw data when audits, reprocessing, or changing metrics definitions matter.

## Output

Return:

```md
Recommendation:
- [architecture choice]

Why:
- [workload evidence]

Tradeoffs:
- [cost, latency, complexity, freshness]

Next validation:
- [small experiment, schema check, benchmark, or operational question]
```

Label unsupported assumptions clearly.
