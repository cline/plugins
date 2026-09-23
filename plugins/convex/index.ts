import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "convex",
	manifest: {
		capabilities: ["mcp", "skills"],
	},
	setup(api) {
		api.registerMcpServer({
			name: "convex",
			transport: {
				type: "stdio",
				command: "npx",
				args: ["-y", "convex@1.41.0", "mcp", "start"],
			},
		})
	},
}

export default plugin
