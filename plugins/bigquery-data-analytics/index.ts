import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "bigquery-data-analytics",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "bigquery",
			transport: {
				type: "streamableHttp",
				url: "https://bigquery.googleapis.com/mcp",
			},
		})
	},
}

export default plugin
