import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "ai-plugins",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "endor-cli-tools",
			transport: {
				type: "stdio",
				command: "endorctl",
				args: ["ai-tools", "mcp-server"],
			},
		})
	},
}

export default plugin
