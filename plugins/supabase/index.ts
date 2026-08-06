import type { AgentPlugin } from "@cline/sdk"

const SUPABASE_MCP_URL = "https://mcp.supabase.com/mcp"

const plugin: AgentPlugin = {
	name: "supabase",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "supabase",
			transport: {
				type: "streamableHttp",
				url: SUPABASE_MCP_URL,
				headers: {
					"X-Source-Name": "cline-plugin",
					"X-Source-Version": "0.0.0",
				},
			},
		})
	},
}

export default plugin
