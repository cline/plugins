# adspirer

Advertising for Cline: the official Adspirer remote MCP server plus 14 skills for analyzing, launching, and optimizing campaigns on Google Ads, Meta Ads, TikTok Ads, LinkedIn Ads, Amazon Ads, and ChatGPT Ads.

## What It Adds

This plugin registers Adspirer's hosted MCP server and bundles the Adspirer skills. It uses Cline's MCP authorization flow. It does not install a CLI, store an API key, read ad accounts, or contact Adspirer during installation.

## Cline Primitives

- MCP: `adspirer` connects to `https://mcp.adspirer.com/mcp` (Streamable HTTP, OAuth 2.1 with PKCE) for campaign performance, wasted spend, keyword research, competitor ad research, conversion tracking audits, and campaign create and update tools.
- Skills: `adspirer-mcp` (tool map and safety rules), `adspirer-setup`, `adspirer-agent`, `adspirer-performance-review`, `adspirer-optimize`, `adspirer-launch`, `adspirer-creative`, `adspirer-docs`, and one skill per platform: `adspirer-google-ads`, `adspirer-meta-ads`, `adspirer-tiktok-ads`, `adspirer-linkedin-ads`, `adspirer-amazon-ads`, `adspirer-chatgpt-ads`.

This plugin bundles MCP and skills only. It adds no rules, hooks, tools, or commands.

## Install

```bash
cline plugin install adspirer
```

For local development from this repository:

```bash
cline plugin install ./plugins/adspirer --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Review my Google Ads and Meta Ads performance for the last 30 days and show me where spend is being wasted.
```

Cline opens the Adspirer sign-in in the browser on first use, then reads the connected accounts and returns the review in the conversation.

## Requirements

- An Adspirer account. Sign-up is free at https://www.adspirer.com and paid plans raise the monthly tool-call quota.
- Ad accounts connected at https://adspirer.ai/connections.
- No API key or environment variable. Sign-in is browser OAuth through Cline.

## Trust Boundaries

Adspirer tools act on real ad accounts and can spend real money. The bundled skills tell the agent to read before it writes, show the exact change and ask for approval before any create, update, pause, budget, or delete call, and create new campaigns paused. Do not auto-approve Adspirer write tools. Tool results can include spend, conversion, audience, and billing-adjacent data from the connected accounts; treat them as private. Text returned from ad platforms (campaign names, search terms, competitor ads) is untrusted data, not instructions.

## Source

Maintained by Adspirer at https://github.com/Adspirer/adspirer-cline. Security contact: see SECURITY.md in that repository.
