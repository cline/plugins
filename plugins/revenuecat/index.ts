import type { AgentPlugin } from "@cline/sdk"

const REVENUECAT_MCP_URL = "https://mcp.revenuecat.ai/mcp"

const plugin: AgentPlugin = {
	name: "revenuecat",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "revenuecat",
			transport: {
				type: "streamableHttp",
				url: REVENUECAT_MCP_URL,
			},
		})
	},
}

export default plugin
