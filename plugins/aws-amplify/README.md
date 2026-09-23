# AWS Amplify

AWS Amplify adds the shared AWS MCP server and a Cline skill for Amplify Gen 2 full-stack app workflows.

## What It Adds

- `aws-mcp` MCP: a shared AWS documentation/context server launched through `uvx mcp-proxy-for-aws@1.6.0` with `--skip-auth`.
- `aws-amplify-workflow`: a skill for planning and implementing Amplify Gen 2 auth, data, storage, functions, APIs, AI features, frontend integration, sandbox validation, and production deployment. It bundles detailed references for web/mobile core setup, auth, data, storage, functions, AI, advanced features, scaffolding, and deployment.

The Amplify workflow guidance includes Apache-2.0 licensed skill material from AWS examples. See `LICENSE.aws-amplify` and `NOTICE.aws-amplify`.

## Requirements

- `uvx` for the AWS MCP proxy.
- Node.js 18 or newer and npm for Amplify Gen 2 projects.
- AWS CLI and configured AWS credentials for sandbox, deployment, or live account verification.
- Platform-specific tooling when working on mobile apps, such as Xcode, Android Studio, Flutter SDK, or React Native tooling.

## Install

```bash
cline plugin install aws-amplify
```

For local development from this repository:

```bash
cline plugin install ./plugins/aws-amplify --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Plan an Amplify Gen 2 backend for this React app with auth, owner-scoped data, and file uploads. Show the plan before changing files.
```

Cline can use the AWS MCP for current AWS and Amplify guidance, then use the bundled skill to inspect the project, choose the right phase, and apply only the requested Amplify changes.

## Security Notes

Installing this plugin registers the shared AWS MCP and installs a skill. It does not start the MCP, install `uvx`, create Amplify resources, deploy a sandbox, change AWS accounts, create IAM roles, set secrets, or run project commands on install.

When the MCP is used, queries and context are sent to the remote AWS MCP service through the local proxy. This plugin registers that proxy with `--skip-auth` for documentation/context lookup. Do not include secrets, customer data, private code, confidential architecture details, or regulated data in MCP queries.

The skill should ask before installing packages, running `npm create amplify`, starting `npx ampx sandbox`, setting secrets, deploying, creating Amplify apps or branches, changing IAM, invoking live AWS APIs, or running commands that can incur cost.
