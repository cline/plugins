import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "expo",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "expo",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.expo.dev/mcp",
			},
		})
	},
}

export default plugin
