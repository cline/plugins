import type { AgentPlugin } from "@cline/sdk"

const ADSPIRER_MCP_URL = "https://mcp.adspirer.com/mcp"

const plugin: AgentPlugin = {
	name: "adspirer",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "adspirer",
			transport: {
				type: "streamableHttp",
				url: ADSPIRER_MCP_URL,
			},
		})
	},
}

export default plugin
