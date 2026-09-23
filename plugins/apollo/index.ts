import type { AgentPlugin } from "@cline/sdk"

const APOLLO_MCP_URL = "https://mcp.apollo.io/mcp"

const plugin: AgentPlugin = {
	name: "apollo",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "apollo",
			transport: {
				type: "streamableHttp",
				url: APOLLO_MCP_URL,
			},
		})
	},
}

export default plugin
