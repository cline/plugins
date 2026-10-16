import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "mapbox",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "mapbox",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.mapbox.com/mcp",
			},
		})

		api.registerMcpServer({
			name: "mapbox-devkit",
			transport: {
				type: "streamableHttp",
				url: "https://mcp-devkit.mapbox.com/mcp",
			},
		})

		api.registerMcpServer({
			name: "mapbox-docs",
			transport: {
				type: "streamableHttp",
				url: "https://mcp-docs.mapbox.com/mcp",
			},
		})
	},
}

export default plugin
