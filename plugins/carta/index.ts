import type { AgentPlugin } from "@cline/sdk"

const PLUGIN_NAME = "carta"

const plugin: AgentPlugin = {
	name: PLUGIN_NAME,
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "carta",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.app.carta.com/mcp",
			},
		})
	},
}

export default plugin
