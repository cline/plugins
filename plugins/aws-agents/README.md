# AWS Agents

AWS Agents adds an AWS knowledge MCP server and Cline skills for building AI agents on AWS AgentCore.

## What It Adds

- `awsknowledge` MCP: a remote Streamable HTTP MCP server for AWS documentation and service guidance.
- `aws-agents-get-started`: choose a framework, check prerequisites, and scaffold an AgentCore project.
- `aws-agents-build`: add memory, app integration, VPC access, multi-agent flows, browser tools, code interpreter, migration work, or teardown planning.
- `aws-agents-connect`: connect an agent to APIs, Lambda tools, MCP servers, Gateway targets, outbound credentials, and Cedar tool policies.
- `aws-agents-deploy`: validate and deploy agents, diagnose failed deploys, and plan rollback or version pinning.
- `aws-agents-debug`: diagnose CLI, environment, trace, log, timeout, model, memory, and tool-call failures.
- `aws-agents-harden`: review production security, IAM scope, inbound auth, secrets, session lifecycle, quotas, and rate limits.
- `aws-agents-optimize`: set up evaluation, observability, quality gates, latency review, and cost analysis.

## Requirements

The MCP server does not require local AWS credentials. Live AgentCore work usually requires an AWS account, configured AWS credentials, the AWS CLI, the AgentCore CLI, and the project language runtime.

Do not paste or commit AWS credentials, API keys, OAuth tokens, JWTs, or secret values. Keep credentials in the AWS credential chain, environment files, CI secrets, or a secret manager.

## Install

```bash
cline plugin install aws-agents
```

For local development from this repository:

```bash
cline plugin install ./plugins/aws-agents --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Help me plan an AgentCore project for a customer support agent, compare the framework options, and tell me what you would need before creating anything.
```

Cline can use the `awsknowledge` MCP for AWS documentation and the bundled skills to guide AgentCore setup, capability design, integration, deployment, debugging, hardening, and optimization.

## Security Notes

Installing this plugin registers the AWS knowledge MCP and installs skills. It does not start local servers, install CLIs, create AWS resources, deploy agents, change IAM, create Gateway targets, store outbound credentials, run evals, read account logs, or delete resources on install.

Queries and context sent to the `awsknowledge` MCP leave the local workspace and go to the remote AWS knowledge service. Do not include secrets, customer data, private code, confidential architecture details, or regulated data in MCP queries.

The skills should ask before running commands that access or mutate AWS accounts, install tools, create projects, deploy resources, change IAM or auth, add credentials, enable observability or online evals, invoke live agents, or incur cost.
