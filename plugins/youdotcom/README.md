# You.com

You.com adds Cline skills for web search, research with citations, content extraction, and agent framework integrations.

## Cline Primitives

- Skills: `youdotcom-api` helps integrate You.com Research, Search, and Contents APIs using direct HTTP calls in any language.
- Skills: `youdotcom-cli` provides curl and jq workflows for search, research, and content extraction.
- Skills: `ydc-ai-sdk-integration`, `ydc-langchain-integration`, `ydc-crewai-mcp-integration`, `ydc-claude-agent-sdk-integration`, and `ydc-openai-agent-sdk-integration` guide You.com tool or MCP integration into common agent frameworks.
- Skills: `teams-anthropic-integration` helps add Anthropic Claude models to Microsoft Teams.ai apps, with optional You.com MCP search/content tools.

## Requirements

- `YDC_API_KEY` is required for Research, Contents, higher rate limits, and most MCP integrations. You.com Search has a limited free tier without an API key.
- Framework-specific skills may also require Anthropic, OpenAI, Microsoft Teams, crewAI, LangChain, Vercel AI SDK, Python, Node.js, Bun, curl, or jq depending on the requested integration path.
- Network access is required for live You.com API/MCP calls and package installation.

## Trust Boundaries

The plugin does not register an MCP server, install dependencies, call You.com, or write MCP settings at install time. It contributes bundled skills only. You.com API and MCP calls are user-requested runtime actions.

Bundled skill material is MIT licensed by You.com. See `LICENSE.youdotcom-agent-skills`.
