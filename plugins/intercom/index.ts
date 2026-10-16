import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "intercom",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "intercom",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.intercom.com/mcp",
			},
			metadata: {
				description:
					"Read Intercom conversations, contacts, and companies through Intercom's remote MCP server.",
			},
		})
	},
}

export default plugin
