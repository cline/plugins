# Intercom

Adds Intercom support workflows to Cline through Intercom's remote MCP server, bundled skills, and customer-data safety guidance inside those skills.

## Cline Primitives

This plugin registers the `intercom` Streamable HTTP MCP server at `https://mcp.intercom.com/mcp` and bundles four skills:

- `intercom-analysis` for support trend analysis, customer issue investigation, and contact or company lookup.
- `intercom-customer-360` for building customer profiles from contact, company, and conversation history.
- `intercom-install-messenger` for adding the Intercom Messenger to a web app with JWT identity verification.
- `intercom-install-cli` for installing and authenticating the optional `@intercom/cli`.

## Requirements

Users need an Intercom workspace and network access to Intercom's MCP endpoint. The remote MCP endpoint currently targets US-hosted Intercom workspaces; EU or Australia region support may require Intercom-side support and region-specific API settings.

Intercom MCP authorization may request article read and write scopes because the remote server can manage Help Center articles. The Messenger installation skill needs the Intercom workspace ID and, for secure authenticated users, the Identity Verification Secret stored server-side. The CLI skill needs Node.js 20.6 or newer and npm.

## Install

```bash
cline plugin install intercom
```

For local development from this repository:

```bash
cline plugin install ./plugins/intercom --cwd .
```

## Example Usage

After installation and Intercom MCP authentication, ask Cline:

```text
Analyze the last 20 open support conversations and summarize the top customer issues with representative conversation IDs.
```

Cline can use the Intercom MCP tools and bundled skills to search conversations, fetch full threads, inspect contacts or companies, and produce grounded support reports.

## Security Notes

The most common workflows are read-oriented support analysis: search conversations, fetch conversation details, inspect contacts, and look up companies. The remote MCP server may also expose Help Center article creation and update tools. Treat customer conversation content as sensitive data, and only create or update articles after the user explicitly asks and approves the content to publish. Do not paste secrets into chat, do not mutate Intercom records casually, and do not install CLI packages or persist credentials without explicit user approval.
