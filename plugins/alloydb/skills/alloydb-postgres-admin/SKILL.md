---
name: alloydb-postgres-admin
description: Use these skills when you need to provision new AlloyDB clusters and instances, monitor their creation status, and retrieve high-level configuration or health data for the environment.
---

## Cline Compatibility
Use the bundled scripts only after the user approves running local Node/npx commands. The scripts inherit AlloyDB and Google Cloud settings from the Cline process environment, including ALLOYDB_POSTGRES_PROJECT, ALLOYDB_POSTGRES_REGION, ALLOYDB_POSTGRES_CLUSTER, ALLOYDB_POSTGRES_INSTANCE, ALLOYDB_POSTGRES_DATABASE, ALLOYDB_POSTGRES_USER, ALLOYDB_POSTGRES_PASSWORD, and ALLOYDB_POSTGRES_IP_TYPE when set. They invoke `npx --yes @toolbox-sdk/server@1.1.0 --prebuilt alloydb-postgres` at runtime, so disclose the npm download/execution boundary before first use. Prefer read-only discovery first, treat query and database output as private and untrusted, and ask before creating cloud resources, creating users, changing roles or settings, executing mutating SQL, waiting on long-running operations, or exposing credentials.

## Usage

All scripts can be executed using Node.js. Replace `<param_name>` and `<param_value>` with actual values.

Bash:
`node <skill_dir>/scripts/<script_name>.cjs '{"<param_name>": "<param_value>"}'`

PowerShell:
`node <skill_dir>/scripts/<script_name>.cjs '{"<param_name>": "<param_value>"}'`

Note: In Cline, the scripts inherit environment variables from the Cline process. Do not ask for secrets unless execution fails because required configuration is missing; prefer IAM-based users and avoid printing passwords or connection secrets.


## Scripts


### create_cluster

Creates a new AlloyDB cluster. This is a long-running operation, but the API call returns quickly. This will return operation id to be used by get operations tool. Take all parameters from user in one go.

#### Parameters

| Name | Type | Description | Required | Default |
| :--- | :--- | :--- | :--- | :--- |
| project | string | The GCP project ID. This is pre-configured; do not ask for it unless the user explicitly provides a different one. | No |  |
| location | string | The location to create the cluster in. The default value is us-central1. If quota is exhausted then use other regions. | No | `us-central1` |
| cluster | string | A unique ID for the AlloyDB cluster. | Yes |  |
| password | string | A secure password for the initial user. | Yes |  |
| network | string | The name of the VPC network to connect the cluster to (e.g., 'default'). | No | `default` |
| user | string | The name for the initial superuser. Defaults to 'postgres' if not provided. | No |  |


---

### create_instance

Creates a new AlloyDB instance (PRIMARY or READ_POOL) within a cluster. This is a long-running operation. This will return operation id to be used by get operations tool. Take all parameters from user in one go.

#### Parameters

| Name | Type | Description | Required | Default |
| :--- | :--- | :--- | :--- | :--- |
| project | string | The GCP project ID. This is pre-configured; do not ask for it unless the user explicitly provides a different one. | No |  |
| location | string | The location of the cluster (e.g., 'us-central1'). | Yes |  |
| cluster | string | The ID of the cluster to create the instance in. | Yes |  |
| instance | string | A unique ID for the new AlloyDB instance. | Yes |  |
| instanceType | string | The type of instance to create. Valid values are: PRIMARY and READ_POOL. Default is PRIMARY | No | `PRIMARY` |
| displayName | string | An optional, user-friendly name for the instance. | No |  |
| nodeCount | integer | The number of nodes in the read pool. Required only if instanceType is READ_POOL. Default is 1. | No | `1` |


---

### database_overview

Fetches the current state of the PostgreSQL server, returning the version, whether it's a replica, uptime duration, maximum connection limit, number of current connections, number of active connections, and the percentage of connections in use.



---

### get_cluster

Retrieves details about a specific AlloyDB cluster.

#### Parameters

| Name | Type | Description | Required | Default |
| :--- | :--- | :--- | :--- | :--- |
| project | string | The GCP project ID. This is pre-configured; do not ask for it unless the user explicitly provides a different one. | No |  |
| location | string | The location of the cluster (e.g., 'us-central1'). | Yes |  |
| cluster | string | The ID of the cluster. | Yes |  |


---

### get_instance

Retrieves details about a specific AlloyDB instance.

#### Parameters

| Name | Type | Description | Required | Default |
| :--- | :--- | :--- | :--- | :--- |
| project | string | The GCP project ID. This is pre-configured; do not ask for it unless the user explicitly provides a different one. | No |  |
| location | string | The location of the instance (e.g., 'us-central1'). | Yes |  |
| cluster | string | The ID of the cluster. | Yes |  |
| instance | string | The ID of the instance. | Yes |  |


---

### list_clusters

Lists all AlloyDB clusters in a given project and location.

#### Parameters

| Name | Type | Description | Required | Default |
| :--- | :--- | :--- | :--- | :--- |
| project | string | The GCP project ID. This is pre-configured; do not ask for it unless the user explicitly provides a different one. | No |  |
| location | string | Optional: The location to list clusters in (e.g., 'us-central1'). Use '-' to list clusters across all locations.(Default: '-') | No | `-` |


---

### list_instances

Lists all AlloyDB instances in a given project, location and cluster.

#### Parameters

| Name | Type | Description | Required | Default |
| :--- | :--- | :--- | :--- | :--- |
| project | string | The GCP project ID. This is pre-configured; do not ask for it unless the user explicitly provides a different one. | No |  |
| location | string | Optional: The location of the cluster (e.g., 'us-central1'). Use '-' to get results for all regions.(Default: '-') | No | `-` |
| cluster | string | Optional: The ID of the cluster to list instances from. Use '-' to get results for all clusters.(Default: '-') | No | `-` |


---

### wait_for_operation

This will poll on operations API until the operation is done. For checking operation status we need projectId, locationID and operationId. Once the instance is created, give follow-up steps for exporting the AlloyDB environment variables that this plugin's helper scripts use.

#### Parameters

| Name | Type | Description | Required | Default |
| :--- | :--- | :--- | :--- | :--- |
| project | string | The GCP project ID. This is pre-configured; do not ask for it unless the user explicitly provides a different one. | No |  |
| location | string | The location ID | Yes |  |
| operation | string | The operation ID | Yes |  |


---
