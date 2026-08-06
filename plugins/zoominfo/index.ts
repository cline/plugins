import type { AgentPlugin } from "@cline/sdk"

const PLUGIN_NAME = "zoominfo"
const ZOOMINFO_MCP_URL = "https://mcp.zoominfo.com/mcp"

const plugin: AgentPlugin = {
	name: PLUGIN_NAME,
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "zoominfo",
			transport: {
				type: "streamableHttp",
				url: ZOOMINFO_MCP_URL,
			},
		})
	},
}

export default plugin
