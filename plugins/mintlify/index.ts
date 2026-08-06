import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "mintlify",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "mintlify",
			transport: {
				type: "streamableHttp",
				url: "https://mintlify.com/docs/mcp",
			},
		})
	},
}

export default plugin
