import type { AgentPlugin } from "@cline/sdk"

const PLUGIN_NAME = "buildkite"

const plugin: AgentPlugin = {
	name: PLUGIN_NAME,
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "buildkite",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.buildkite.com/mcp",
			},
		})
	},
}

export default plugin
