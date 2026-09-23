---
name: mongodb-mcp-setup
description: Guide users through configuring the plugin-owned MongoDB MCP server credentials, read-only mode, and Atlas Local option. Use when a user asks how to connect Cline to MongoDB or Atlas, when MongoDB MCP tools are unavailable because credentials are missing, or when they need help choosing a MongoDB MCP authentication option.
---

# MongoDB MCP Server Setup

This skill guides users through configuring the MongoDB MCP server registered by this Cline plugin.

Do not ask the user to paste MongoDB credentials into chat. Provide exact environment variable names and let the user set secrets directly in their shell, OS environment, Cline MCP settings, or another local secret mechanism they control.

## Overview

The plugin installs `mongodb-mcp-server` locally and registers one plugin-owned stdio MCP server named `mongodb`. The server defaults to read-only mode through:

```bash
MDB_MCP_READ_ONLY=true
```

Users can authenticate in one of three ways:

1. Connection string: direct access to a MongoDB deployment.
   - Best for one cluster or self-hosted MongoDB.
   - Requires `MDB_MCP_CONNECTION_STRING`.

2. Atlas service account: MongoDB Atlas Admin API access.
   - Best for Atlas users who need cluster discovery, Atlas administration, or dynamic cluster connection.
   - Requires `MDB_MCP_API_CLIENT_ID` and `MDB_MCP_API_CLIENT_SECRET`.

3. Atlas Local: local development with Docker.
   - Best for local testing with no cloud credentials.
   - Requires Docker, but no MongoDB credentials.

## Step 1: Check Existing Configuration

Check whether MongoDB MCP variables are already visible to the current process:

```bash
env | grep "^MDB_MCP" | sed '/^MDB_MCP_READ_ONLY=/!s/=.*/=[set]/'
```

Interpretation:

- `MDB_MCP_CONNECTION_STRING` means direct connection-string auth is configured.
- Both `MDB_MCP_API_CLIENT_ID` and `MDB_MCP_API_CLIENT_SECRET` mean Atlas service-account auth is configured. If only one is present, treat the setup as incomplete.
- `MDB_MCP_READ_ONLY=true` means the server is in read-only mode.

If the user needs Atlas Admin API actions but only has `MDB_MCP_CONNECTION_STRING`, explain that they need service-account credentials instead.

## Step 2: Choose Authentication

If no valid configuration exists, help the user choose:

- Connection string: simplest path for a known cluster.
- Atlas service account: best for Atlas Admin API, multi-cluster discovery, user management, performance advisor, and Atlas Stream Processing.
- Atlas Local: best for local development or demos without cloud access.

## Step 3a: Connection String Setup

For Atlas:

1. Open MongoDB Atlas.
2. Select the cluster.
3. Click Connect.
4. Choose Drivers or Shell.
5. Copy the connection string and replace placeholders with database-user credentials.

Expected formats:

```text
mongodb://username:password@host:port/database
mongodb+srv://username:password@cluster.mongodb.net/database
mongodb://host:port
```

The user should set:

```bash
export MDB_MCP_CONNECTION_STRING="<connection-string>"
```

## Step 3b: Atlas Service Account Setup

Guide the user through creating an Atlas service account:

1. Open MongoDB Atlas.
2. Select the organization or project.
3. Go to Project Identity and Access, then Applications.
4. Create a service account.
5. Grant the minimum role needed for the requested workflow. Use Project Owner only when the workflow truly needs administrative access.
6. Generate client credentials and store the client secret immediately. Atlas only shows it once.

The user should set:

```bash
export MDB_MCP_API_CLIENT_ID="<client-id>"
export MDB_MCP_API_CLIENT_SECRET="<client-secret>"
```

Important: the service account's API Access List must include the user's current IP address or Atlas Admin API operations will fail. Prefer a specific IP or narrow CIDR. Avoid `0.0.0.0/0`; if used temporarily for testing, remove it immediately afterward.

## Step 3c: Atlas Local Setup

For Atlas Local, verify Docker:

```bash
docker info
```

If Docker is available, no MongoDB credentials are needed. The user can use Atlas Local MCP tools such as creating and listing local deployments after the MCP server is connected.

## Step 4: Read-Only vs Read-Write

Read-only mode is the plugin default and should remain enabled for production data, reporting, auditing, and exploratory analysis.

Use read-write mode only when the user explicitly wants the MCP server to perform mutations or Atlas resource changes and understands the impact. To opt in:

```bash
export MDB_MCP_READ_ONLY=false
```

Before any write, destructive operation, index creation, processor start, Atlas resource update, or billing-affecting action, summarize the exact operation and ask for explicit confirmation.

## Step 5: Make Variables Available to Cline

The MongoDB MCP server is launched by Cline, so credentials must be available in the environment used to start Cline or configured through Cline's MCP settings mechanism.

Recommended shell pattern:

```bash
cat > ~/.mongodb-mcp-env <<'EOF'
export MDB_MCP_READ_ONLY=true
export MDB_MCP_CONNECTION_STRING="<connection-string>"
# Or use Atlas service-account variables instead:
# export MDB_MCP_API_CLIENT_ID="<client-id>"
# export MDB_MCP_API_CLIENT_SECRET="<client-secret>"
EOF
chmod 600 ~/.mongodb-mcp-env
source ~/.mongodb-mcp-env
```

Then start Cline from that same shell so the plugin-owned MCP server inherits the variables.

On Windows PowerShell, use an equivalent local profile or session environment assignment. Do not commit credentials to a repository.

## Step 6: Verify

After setting variables and restarting/reloading Cline, ask Cline to list MongoDB databases or inspect a known collection through the registered MongoDB MCP tools.

If no tools are available:

1. Confirm the MongoDB plugin is enabled.
2. Confirm the `mongodb` MCP server appears in Cline's MCP view.
3. Confirm the environment variables are visible to the Cline process.
4. Confirm connection-string auth or service-account auth is complete.
5. For Atlas service accounts, confirm the API Access List includes the current IP.

## Troubleshooting

- Invalid connection string: it must start with `mongodb://` or `mongodb+srv://`.
- Atlas Admin API errors: check service-account role and API Access List.
- Read-only behavior: the plugin defaults `MDB_MCP_READ_ONLY` to `true`; set `MDB_MCP_READ_ONLY=false` only when intentionally enabling writes.
- Desktop environment variables: apps launched from a dock/start menu often do not inherit shell profile variables. Start Cline from a shell that has sourced the env file, or configure variables through Cline's supported settings path.
- Docker errors for Atlas Local: ensure Docker Desktop or Docker Engine is running before using local deployment tools.
