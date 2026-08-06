# GraphQL API Reference

Endpoint: `https://graphql.buildkite.com/v1`

The GraphQL API supports queries and mutations with cursor-based pagination. Use it for operations not available in the REST API (cluster management, pipeline templates, complex mutations) and when fetching nested or specific fields to reduce response size.

## Basic Query

```bash
curl -sS -X POST "https://graphql.buildkite.com/v1" \
  -H "Authorization: Bearer $BUILDKITE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { viewer { user { name email } } }"
  }'
```

## Cursor-Based Pagination

GraphQL uses cursor-based pagination via the `Connection` pattern:

```graphql
query PaginatedBuilds($cursor: String) {
  pipeline(slug: "my-org/my-pipeline") {
    builds(first: 50, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          number
          state
          message
          createdAt
        }
      }
    }
  }
}
```

| Parameter | Description |
|-----------|-------------|
| `first` | Return the first N results (forward pagination) |
| `after` | Cursor to start after (from `pageInfo.endCursor`) |
| `last` | Return the last N results (backward pagination) |
| `before` | Cursor to start before (from `pageInfo.startCursor`) |

`PageInfo` fields:

| Field | Description |
|-------|-------------|
| `hasNextPage` | More results exist after the current page |
| `hasPreviousPage` | More results exist before the current page |
| `startCursor` | Cursor of the first item in this page |
| `endCursor` | Cursor of the last item in this page |

To paginate: query with `first: N`, read `pageInfo.endCursor`, pass it as `after` in the next request. Loop until `hasNextPage` is `false`.

## Key Queries

Get build with job details:

```graphql
query {
  build(slug: "my-org/my-pipeline/42") {
    number
    state
    message
    branch
    commit
    createdAt
    finishedAt
    jobs(first: 50) {
      edges {
        node {
          ... on JobTypeCommand {
            label
            state
            exitStatus
            startedAt
            finishedAt
          }
        }
      }
    }
  }
}
```

List clusters and queues:

```graphql
query {
  organization(slug: "my-org") {
    clusters(first: 10) {
      edges {
        node {
          name
          uuid
          queues(first: 20) {
            edges { node { key description } }
          }
        }
      }
    }
  }
}
```

## Key Mutations

Create a build:

```graphql
mutation {
  buildCreate(input: {
    pipelineID: "UGlwZWxpbmUtLS0..."
    commit: "HEAD"
    branch: "main"
    message: "Triggered via GraphQL"
    env: ["DEPLOY_TARGET=staging"]
  }) {
    build {
      number
      url
      state
    }
  }
}
```

Note: `pipelineID` is the GraphQL node ID (base64-encoded), not the pipeline slug. Retrieve it with a pipeline query first.

Create a pipeline (use `clusterId` to associate with a cluster):

```graphql
mutation {
  pipelineCreate(input: {
    organizationId: "T3JnYW5pemF0aW9uLS0t..."
    clusterId: "Q2x1c3Rlci0tLQ..."
    name: "My New Pipeline"
    repository: { url: "git@github.com:my-org/my-repo.git" }
    steps: { yaml: "steps:\n  - label: ':test_tube: Test'\n    command: 'make test'" }
    defaultBranch: "main"
  }) {
    pipeline {
      slug
      url
    }
  }
}
```

Create a cluster queue:

```graphql
mutation {
  clusterQueueCreate(input: {
    organizationId: "T3JnYW5pemF0aW9uLS0t..."
    clusterId: "Q2x1c3Rlci0tLQ..."
    key: "linux-large"
    description: "Large Linux instances for monorepo builds"
  }) {
    clusterQueue {
      id
      key
      description
    }
  }
}
```

> For detailed guidance on cluster and queue provisioning strategy, see the Buildkite agent infrastructure documentation.

Other key mutations: `pipelineUpdate`, `pipelineTemplateCreate` (Enterprise), `agentTokenCreate`, `agentTokenRevoke`.

## REST vs GraphQL Decision Guide

| Scenario | Use | Why |
|----------|-----|-----|
| Trigger a build | Either | Both support it; REST is simpler |
| List builds with filtering | REST | Better query parameter support |
| Fetch build + jobs + artifacts in one call | GraphQL | Single request, no N+1 |
| Create or update cluster queues | GraphQL | Not available in REST |
| Create pipeline templates | GraphQL | Not available in REST |
| Manage agent tokens | GraphQL | More control than REST |
| Simple CRUD on pipelines | REST | Simpler request/response |
| Audit events | GraphQL | `auditEvent` query available |
| Bulk operations on many pipelines | GraphQL | Fetch specific fields only, reduce payload size |

## Introspection

Use standard GraphQL introspection (`__schema`, `__type`) to discover available fields and types. The Buildkite GraphQL API supports full schema introspection.
