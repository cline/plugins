import type { AgentPlugin } from "@cline/sdk"

const PLUGIN_NAME = "circle"

const plugin: AgentPlugin = {
	name: PLUGIN_NAME,
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "circle-codegen",
			transport: {
				type: "streamableHttp",
				url: "https://api.circle.com/v1/codegen/mcp",
			},
		})
	},
}

export default plugin
