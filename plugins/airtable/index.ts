import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "airtable",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "airtable",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.airtable.com/mcp",
			},
		})
	},
}

export default plugin
