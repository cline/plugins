import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "fullstory",
	manifest: {
		capabilities: ["mcp", "skills"],
	},
	setup(api) {
		api.registerMcpServer({
			name: "fullstory",
			transport: {
				type: "streamableHttp",
				url: "https://api.fullstory.com/mcp/fullstory",
			},
			metadata: {
				description:
					"Query Fullstory behavioral analytics, metrics, segments, and session replay context through the Fullstory MCP server.",
				requiresAuthentication: true,
			},
		})
	},
}

export default plugin
