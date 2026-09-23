import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "valtown",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "valtown",
			transport: {
				type: "streamableHttp",
				url: "https://api.val.town/v3/mcp",
			},
		})
	},
}

export default plugin
