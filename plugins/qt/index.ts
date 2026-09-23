import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "qt",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "qt-docs",
			transport: {
				type: "streamableHttp",
				url: "https://qt-docs-mcp.qt.io/mcp",
			},
			metadata: {
				description:
					"Qt Documentation MCP server for searching and reading Qt API documentation.",
			},
		})
	},
}

export default plugin
