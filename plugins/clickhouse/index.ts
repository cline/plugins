import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "clickhouse",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "clickhouse-cloud",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.clickhouse.cloud/mcp",
			},
		})
	},
}

export default plugin
