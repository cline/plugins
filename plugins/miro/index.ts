import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "miro",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "miro",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.miro.com/",
				headers: {
					"X-AI-Source": "cline-plugin",
				},
			},
			metadata: {
				description:
					"Use Miro boards for board context, diagrams, documents, tables, and visual collaboration workflows.",
			},
		})
	},
}

export default plugin
