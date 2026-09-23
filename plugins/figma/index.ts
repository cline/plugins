import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "figma",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "figma",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.figma.com/mcp",
			},
		})
	},
}

export default plugin
