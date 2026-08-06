import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "lusha",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "lusha",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.lusha.com/mcp/claude",
				headers: {
					"X-Lusha-Plugin": "claude",
					"X-Lusha-Plugin-Version": "0.1.0",
				},
			},
		})
	},
}

export default plugin
