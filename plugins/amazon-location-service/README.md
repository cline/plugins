# amazon-location-service

Amazon Location Service guidance and AWS MCP access for building maps, places search, geocoding, routes, geofences, and tracking into AWS-backed applications.

## What It Does

Installs the `amazon-location-service` skill. The skill helps Cline choose the right Amazon Location Service APIs, SDKs, auth pattern, coordinate format, and MapLibre setup for common geospatial app work. It also bundles focused references for address input, address verification, routes, dynamic maps, places search, and browser JavaScript integration.

Registers the `aws-mcp` server through AWS's SigV4 proxy. That MCP server can expose AWS documentation, regional availability, service recommendations, and AWS API tools when the local AWS credentials allow it.

The Amazon Location workflow guidance includes MIT-0 licensed skill material from AWS geospatial examples.

## Install

```bash
cline plugin install amazon-location-service
```

For local development from this repository:

```bash
cline plugin install ./plugins/amazon-location-service --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Add an Amazon Location Service address autocomplete field and interactive map to this React app.
```

or:

```text
Use AWS MCP to check the right Amazon Location permissions for a browser app that needs places search and routes.
```

## Requirements

- A Cline build with plugin MCP registration support. If installing this plugin does not add an `aws-mcp` entry to Cline MCP settings, update Cline before using the MCP server.
- `uvx` on PATH so Cline can run `mcp-proxy-for-aws`.
- Local AWS credentials configured through the normal AWS credential chain, such as environment variables, shared credentials, SSO, or an assumed role.
- IAM permissions for whichever AWS APIs the MCP tools call.
- Amazon Location Service API keys or Cognito setup when implementing browser or mobile application features.
- Network access to the AWS MCP endpoint in `us-east-1`.
- `AWS_REGION` or `AWS_DEFAULT_REGION` set before installation if you want AWS MCP operations to default somewhere other than `us-east-1`. The plugin stores that value in the MCP proxy args as `--metadata AWS_REGION=<region>`.

## Security Notes

On first MCP startup, Cline runs `uvx mcp-proxy-for-aws==1.6.1 https://aws-mcp.us-east-1.api.aws/mcp ...`. That downloads and executes the AWS MCP proxy if it is not already cached. The proxy signs AWS MCP requests with your local AWS credentials.

Use least-privilege credentials. A read-only or development AWS profile is a safer default than a broad production role. Review the credentials, account, region, and IAM permissions before asking Cline to inspect or change AWS resources.

Location data can identify people, customers, facilities, and routes. Avoid committing API keys, coordinates, addresses, tracking data, or generated config files that contain sensitive information.

The MCP server is installed as plugin-owned configuration. Removing the plugin removes the `aws-mcp` entry that this plugin created.
