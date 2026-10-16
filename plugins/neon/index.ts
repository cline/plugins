import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "neon",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "neon",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.neon.tech/mcp",
			},
			metadata: {
				description:
					"Manage Neon Serverless Postgres projects, branches, connection strings, and database workflows.",
			},
		})
	},
}

export default plugin
