---
name: mongodb-atlas-stream-processing
description: "Manages MongoDB Atlas Stream Processing (ASP) workflows. Handles workspace provisioning, data source/sink connections, processor lifecycle operations, debugging diagnostics, and tier sizing. Supports Kafka, Atlas clusters, S3, HTTPS, and Lambda integrations for streaming data workloads and event processing. NOT for general MongoDB queries or Atlas cluster management. Requires MongoDB MCP Server with Atlas API credentials."
---

# MongoDB Atlas Streams

Build, operate, and debug Atlas Stream Processing (ASP) pipelines using four MCP tools from the MongoDB MCP Server.

## Prerequisites

This skill requires the MongoDB MCP Server connected with:
- Atlas API credentials (`apiClientId` and `apiClientSecret`)

The 4 tools: `atlas-streams-discover`, `atlas-streams-build`, `atlas-streams-manage`, `atlas-streams-teardown`.

All operations require an Atlas project ID. If unknown, call `atlas-list-projects` first to find your project ID.

Cline discovers live tool names and input schemas from the registered `mongodb` MCP server. The tool names and argument examples in this skill reflect the bundled `mongodb-mcp-server` version; if the live schema differs, follow the live schema.

## If MCP tools are unavailable

If the MongoDB MCP Server is not connected or the streams tools are missing, see [references/mcp-troubleshooting.md](references/mcp-troubleshooting.md) for diagnostic steps and fallback options.

## Tool Selection Matrix

### atlas-streams-discover - ALL read operations
| Action | Use when |
|--------|----------|
| `list-workspaces` | See all workspaces in a project |
| `inspect-workspace` | Review workspace config, state, region |
| `list-connections` | See all connections in a workspace |
| `inspect-connection` | Check connection state, config, health |
| `list-processors` | See all processors in a workspace |
| `inspect-processor` | Check processor state, pipeline, config |
| `diagnose-processor` | Full health report: state, stats, errors |
| `get-networking` | PrivateLink and VPC peering details. Optional: `cloudProvider` + `region` to get Atlas account details for PrivateLink setup |

Pagination (all list actions): `limit` (1-100, default 20), `pageNum` (default 1).
Response format: `responseFormat` - `"concise"` (default for list actions) or `"detailed"` (default for inspect/diagnose).

### atlas-streams-build - ALL create operations
| Resource | Key parameters |
|----------|---------------|
| `workspace` | `cloudProvider`, `region`, `tier` (default SP10), `includeSampleData` |
| `connection` | `connectionName`, `connectionType` (Kafka/Cluster/S3/Https/Kinesis/Lambda/SchemaRegistry/Sample), `connectionConfig` |
| `processor` | `processorName`, `pipeline` (must start with `$source`, end with `$merge`/`$emit`), `dlq`, `autoStart` |
| `privatelink` | `privateLinkConfig` (project-level, not tied to a specific workspace) |

Field mapping - only fill fields for the selected resource type:

- resource = "workspace": Fill: `projectId`, `workspaceName`, `cloudProvider`, `region`, `tier`, `includeSampleData`. Leave empty: all connection and processor fields.
- resource = "connection": Fill: `projectId`, `workspaceName`, `connectionName`, `connectionType`, `connectionConfig`. Leave empty: all workspace and processor fields. (See [references/connection-configs.md](references/connection-configs.md) for type-specific schemas.)
- resource = "processor": Fill: `projectId`, `workspaceName`, `processorName`, `pipeline`, `dlq` (recommended), `autoStart` (optional). Leave empty: all workspace and connection fields. (See [references/pipeline-patterns.md](references/pipeline-patterns.md) for pipeline examples.)
- resource = "privatelink": Fill: `projectId`, `privateLinkConfig`. Note: PrivateLink is project-level, not workspace-level. `workspaceName` is not required - omit it. Leave empty: all connection and processor fields.

### atlas-streams-manage - ALL update/state operations
| Action | Notes |
|--------|-------|
| `start-processor` | Begins billing. Optional `tier` override, `resumeFromCheckpoint` |
| `stop-processor` | Stops billing. Retains state 45 days |
| `modify-processor` | Processor must be stopped first. Change pipeline, DLQ, or name |
| `update-workspace` | Change tier or region |
| `update-connection` | Update config (networking is immutable - must delete and recreate) |
| `accept-peering` / `reject-peering` | VPC peering management |

Field mapping - always fill `projectId`, `workspaceName`, then by action:

- `"start-processor"` -> `resourceName`. Optional: `tier`, `resumeFromCheckpoint`, `startAtOperationTime` (ISO 8601 timestamp to resume from a specific point)
- `"stop-processor"` -> `resourceName`
- `"modify-processor"` -> `resourceName`. At least one of: `pipeline`, `dlq`, `newName`
- `"update-workspace"` -> `newRegion` or `newTier`
- `"update-connection"` -> `resourceName`, `connectionConfig`. Exception: networking config (e.g., PrivateLink) cannot be modified after creation - delete and recreate.
- `"accept-peering"` -> `peeringId`, `requesterAccountId`, `requesterVpcId`
- `"reject-peering"` -> `peeringId`

State pre-checks:
- `start-processor` -> errors if processor is already STARTED
- `stop-processor` -> no-ops if already STOPPED or CREATED (not an error)
- `modify-processor` -> errors if processor is STARTED (must stop first)

Processor states: `CREATED` -> `STARTED` (via start) -> `STOPPED` (via stop). Can also enter `FAILED` on runtime errors. Modify requires STOPPED or CREATED state.

Teardown safety checks:
- Processor deletion -> auto-stops before deleting (no need to stop manually first)
- Connection deletion -> blocks if any running processor references it. Stop/delete referencing processors first.
- Workspace deletion -> See detailed workflow below (lines 108-111).

### atlas-streams-teardown - ALL delete operations
| Resource | Safety behavior |
|----------|----------------|
| `processor` | Auto-stops before deleting |
| `connection` | Blocks if referenced by running processor |
| `workspace` | Cascading delete of all connections and processors |
| `privatelink` / `peering` | Remove networking resources |

Field mapping - always fill `projectId`, `resource`, then:

- `resource: "workspace"` -> `workspaceName`
- `resource: "connection"` or `"processor"` -> `workspaceName`, `resourceName`
- `resource: "privatelink"` or `"peering"` -> `resourceName` (the ID). These are project-level resources, not tied to a specific workspace.

Before deleting a workspace, inspect it first:
1. `atlas-streams-discover` -> `inspect-workspace` - get connection/processor counts
2. Present to user: "Workspace X contains N connections and M processors. Deleting permanently removes all. Proceed?"
3. Wait for confirmation before calling `atlas-streams-teardown`

## Validate Before Creating Processors

Before composing any processor pipeline, validate current Atlas Stream Processing stage fields and examples.
- Prefer the registered MongoDB MCP knowledge/docs/search tools when available.
- Use the bundled references in this skill for local field and pattern guidance.
- Ask for explicit approval before fetching external examples from the official ASP examples repository or any other network source.

Field validation should include the sink/source type, e.g. "Atlas Stream Processing $emit S3 fields" or "Atlas Stream Processing Kafka $source configuration". This catches errors like `prefix` vs `path` for S3 `$emit`.

When the user approves external lookup for non-trivial processors, the official ASP examples repository contains quickstarts, example processors, and Terraform examples. Start with its `example_processors/README.md` pattern catalog.

Key quickstarts:
| Quickstart | Pattern |
|-----------|---------|
| `00_hello_world.json` | Inline `$source.documents` with `$match` (zero infra, ephemeral) |
| `01_changestream_basic.json` | Change stream -> tumbling window -> `$merge` to Atlas |
| `03_kafka_to_mongo.json` | Kafka source -> tumbling window rollup -> `$merge` to Atlas |
| `04_mongo_to_mongo.json` | Chained processors: rollup -> archive to separate collection |
| `05_kafka_tail.json` | Real-time Kafka topic monitoring (sinkless, like `tail -f`) |

## Pipeline Rules & Warnings

Invalid constructs - these are NOT valid in streaming pipelines:
- `$$NOW`, `$$ROOT`, `$$CURRENT` - NOT available in stream processing. NEVER use these. Use the document's own timestamp field or `_stream_meta` metadata for event time instead of `$$NOW`.
- HTTPS connections as `$source` - HTTPS is for `$https` enrichment or sink only, NOT as a data source
- Kafka `$source` without `topic` - topic field is required
- Pipelines without a sink - terminal stage (`$merge`, `$emit`, `$https`, or `$externalFunction` async) required for deployed processors (sinkless only works via `sp.process()`)
- Lambda as `$emit` target - Lambda uses `$externalFunction` (mid-pipeline enrichment), not `$emit`
- `$validate` with `validationAction: "error"` - crashes processor; use `"dlq"` instead

Required fields by stage:
- `$source` (change stream): include `fullDocument: "updateLookup"` to get the full document content
- `$source` (Kinesis): use `stream` (NOT `streamName` or `topic`)
- `$emit` (Kinesis): MUST include `partitionKey`
- `$emit` (S3): use `path` (NOT `prefix`)
- `$https`: must include `connectionName`, `path`, `method`, `as`, `onError: "dlq"`
- `$externalFunction`: must include `connectionName`, `functionName`, `execution`, `as`, `onError: "dlq"`
- `$validate`: must include `validator` with `$jsonSchema` and `validationAction: "dlq"`
- `$lookup`: include `parallelism` setting (e.g., `parallelism: 2`) for concurrent I/O
- AWS connections (S3, Kinesis, Lambda): IAM role ARN must be registered via Atlas Cloud Provider Access first. Always confirm this with user. See [references/connection-configs.md](references/connection-configs.md) for details.

See [references/pipeline-patterns.md](references/pipeline-patterns.md) for stage field examples with JSON syntax.

SchemaRegistry connection: `connectionType` must be `"SchemaRegistry"` (not `"Kafka"`). Schema type values are case-sensitive (use lowercase `avro`, not `AVRO`). See [references/connection-configs.md](references/connection-configs.md#schemaregistry) for required fields and auth types.

## MCP Tool Behaviors

Elicitation: When creating connections, the build tool auto-collects missing sensitive fields (passwords, bootstrap servers) via MCP elicitation. Do NOT ask the user for these - let the tool collect them.

Auto-normalization:
- `bootstrapServers` array -> auto-converted to comma-separated string
- `schemaRegistryUrls` string -> auto-wrapped in array
- `dbRoleToExecute` -> defaults to `{role: "readWriteAnyDatabase", type: "BUILT_IN"}` for Cluster connections

Workspace creation: `includeSampleData` defaults to `true`, which auto-creates the `sample_stream_solar` connection.

Region naming: The `region` field uses Atlas-specific names that differ by cloud provider. Using the wrong format returns a cryptic `dataProcessRegion` error.

| Provider | Cloud Region | Streams `region` Value |
|----------|-------------|----------------------|
| AWS | us-east-1 | `VIRGINIA_USA` |
| AWS | us-east-2 | `OHIO_USA` |
| AWS | eu-west-1 | `DUBLIN_IRL` |
| GCP | us-central1 | `US_CENTRAL1` |
| GCP | europe-west1 | `EUROPE_WEST1` |
| Azure | eastus | `eastus` |
| Azure | westeurope | `westeurope` |

See [references/connection-configs.md](references/connection-configs.md) for the full region mapping table. If unsure, inspect an existing workspace with `atlas-streams-discover` -> `inspect-workspace` and check `dataProcessRegion.region`.

## Connection Capabilities - Source/Sink Reference

Know what each connection type can do before creating pipelines:

| Connection Type | As Source ($source) | As Sink ($merge / $emit) | Mid-Pipeline | Notes |
|-----------------|---------------------|--------------------------|--------------|-------|
| Cluster | OK: Change streams | OK: $merge to collections | OK: $lookup | Change streams monitor insert/update/delete/replace operations |
| Kafka | OK: Topic consumer | OK: $emit to topics | Avoid: | Source MUST include `topic` field |
| Sample Stream | OK: Sample data | Avoid: Not valid | Avoid: | Testing/demo only |
| S3 | Avoid: Not valid | OK: $emit to buckets | Avoid: | Sink only - use `path`, `format`, `compression`. Supports AWS PrivateLink. |
| Https | Avoid: Not valid | OK: $https as sink | OK: $https enrichment | Can be used mid-pipeline for enrichment OR as final sink stage |
| AWSLambda | Avoid: Not valid | OK: $externalFunction (async only) | OK: $externalFunction (sync or async) | Sink: `execution: "async"` required. Mid-pipeline: `execution: "sync"` or `"async"` |
| AWS Kinesis | OK: Stream consumer | OK: $emit to streams | Avoid: | Similar to Kafka pattern |
| SchemaRegistry | Avoid: Not valid | Avoid: Not valid | OK: Schema resolution | Metadata only - used by Kafka connections for Avro schemas |

Common connection usage mistakes to avoid:
- Avoid: Using `$externalFunction` as sink with `execution: "sync"` -> Must use `execution: "async"` for sink stage
- Avoid: Forgetting change streams exist -> Atlas Cluster is a powerful source, not just a sink
- Avoid: Using `$merge` with Kafka -> Use `$emit` for Kafka sinks

See [references/connection-configs.md](references/connection-configs.md) for detailed connection configuration schemas by type.

## Core Workflows

### Setup from scratch
1. `atlas-streams-discover` -> `list-workspaces` (check existing)
2. `atlas-streams-build` -> `resource: "workspace"` (region near data, SP10 for dev)
3. `atlas-streams-build` -> `resource: "connection"` (for each source/sink/enrichment)
4. Validate connections: `atlas-streams-discover` -> `list-connections` + `inspect-connection` for each - verify names match targets, present summary to user
5. Validate field names through available MongoDB MCP knowledge/docs/search tools or bundled references. Ask before fetching external ASP examples.
6. `atlas-streams-build` -> `resource: "processor"` (with DLQ configured)
7. `atlas-streams-manage` -> `start-processor` (warn about billing)

### Workflow Patterns

Incremental pipeline development (recommended):
See [references/development-workflow.md](references/development-workflow.md) for the full 5-phase lifecycle.
1. Start with basic `$source` -> `$merge` pipeline (validate connectivity)
2. Add `$match` stages (validate filtering)
3. Add `$addFields` / `$project` transforms (validate reshaping)
4. Add windowing or enrichment (validate aggregation logic)
5. Add error handling / DLQ configuration

Modify a processor pipeline:
1. `atlas-streams-manage` -> `action: "stop-processor"` - processor MUST be stopped first
2. `atlas-streams-manage` -> `action: "modify-processor"` - provide new pipeline
3. `atlas-streams-manage` -> `action: "start-processor"` - restart

Debug a failing processor:
1. `atlas-streams-discover` -> `diagnose-processor` - one-shot health report. Always call this first.
2. Commit to a specific root cause. Match symptoms to diagnostic patterns:
   - Error 419 + "no partitions found" -> Kafka topic doesn't exist or is misspelled
   - State: FAILED + multiple restarts -> connection-level error (bypasses DLQ), check connection config
   - State: STARTED + zero output + windowed pipeline -> likely idle Kafka partitions blocking window closure; add `partitionIdleTimeout` to Kafka `$source` (e.g., `{"size": 30, "unit": "second"}`)
   - State: STARTED + zero output + non-windowed -> check if source has data; inspect Kafka offset lag
   - High memoryUsageBytes approaching tier limit -> OOM risk; recommend higher tier
   - DLQ count increasing -> per-document errors; use MongoDB `find` on DLQ collection
   See [references/output-diagnostics.md](references/output-diagnostics.md) for the full pattern table.
3. Classify processor type before interpreting output volume (alert vs transformation vs filter).
4. Provide concrete, ordered fix steps specific to the diagnosed root cause. Do NOT present a list of hypothetical scenarios.
5. If detailed logs are needed, direct the user to the Atlas UI: Atlas -> Stream Processing -> Workspace -> Processor -> Logs tab.

### Chained processors (multi-sink pattern)
CRITICAL: A single pipeline can only have ONE terminal sink (`$merge` or `$emit`). When users request multiple output destinations (e.g., "write to Atlas AND emit to Kafka"), you MUST acknowledge the single-sink constraint and propose chained processors using an intermediate destination. See [references/pipeline-patterns.md](references/pipeline-patterns.md) for the full pattern with examples.

## Pre-Deploy & Post-Deploy Checklists

See [references/development-workflow.md](references/development-workflow.md) for the complete pre-deploy quality checklist (connection validation, pipeline validation) and post-deploy verification workflow.

## Tier Sizing & Performance

See [references/sizing-and-parallelism.md](references/sizing-and-parallelism.md) for tier specifications, parallelism formulas, complexity scoring, and performance optimization strategies.

## Troubleshooting

See [references/development-workflow.md](references/development-workflow.md) for the complete troubleshooting table covering processor failures, API errors, configuration issues, and performance problems.

## Billing & Cost

Atlas Stream Processing has no free tier. All deployed processors incur continuous charges while running.

- Charges are per-hour, calculated per-second, only while the processor is running
- `stop-processor` stops billing; stopped processors retain state for 45 days at no charge
- For prototyping without billing: Use `sp.process()` in mongosh - runs pipelines ephemerally without deploying a processor
- See `references/sizing-and-parallelism.md` for tier pricing and cost optimization strategies

## Safety Rules

- `atlas-streams-teardown` and `atlas-streams-manage` require user confirmation - do not bypass
- BEFORE calling `atlas-streams-teardown` for a workspace, you MUST first inspect the workspace with `atlas-streams-discover` to count connections and processors, then present this information to the user before requesting confirmation
- BEFORE creating any processor, you MUST validate all connections per the "Pre-Deployment Validation" section in [references/development-workflow.md](references/development-workflow.md)
- Deleting a workspace removes ALL connections and processors permanently
- After stopping a processor, state is preserved 45 days - then checkpoints are discarded
- `resumeFromCheckpoint: false` drops all window state - warn user first
- Moving processors between workspaces is not supported (must recreate)
- Dry-run / simulation is not supported - explain what you would do and ask for confirmation
- Always warn users about billing before starting processors
- Store API authentication credentials in connection settings, never hardcode in processor pipelines

## Reference Files

| File | Read when... |
|------|-------------|
| [`references/pipeline-patterns.md`](references/pipeline-patterns.md) | Building or modifying processor pipelines |
| [`references/connection-configs.md`](references/connection-configs.md) | Creating connections (type-specific schemas) |
| [`references/development-workflow.md`](references/development-workflow.md) | Following lifecycle management or debugging decision trees |
| [`references/output-diagnostics.md`](references/output-diagnostics.md) | Processor output is unexpected (zero, low, or wrong) |
| [`references/sizing-and-parallelism.md`](references/sizing-and-parallelism.md) | Choosing tiers, tuning parallelism, or optimizing cost |
