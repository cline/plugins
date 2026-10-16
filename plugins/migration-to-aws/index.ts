import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "migration-to-aws",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "aws-knowledge",
			transport: {
				type: "streamableHttp",
				url: "https://knowledge-mcp.global.api.aws",
			},
			metadata: {
				description:
					"AWS documentation, regional availability, and architecture guidance for migration planning.",
			},
		})
	},
}

export default plugin
