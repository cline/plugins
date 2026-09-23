import type { AgentPlugin } from "@cline/sdk"

const ATLASSIAN_OAUTH_MCP_URL = "https://mcp.atlassian.com/v1/mcp/authv2"
const ATLASSIAN_STATIC_AUTH_MCP_URL = "https://mcp.atlassian.com/v1/mcp"

const plugin: AgentPlugin = {
	name: "atlassian",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		const authorization = process.env.ATLASSIAN_MCP_AUTHORIZATION?.trim()

		api.registerMcpServer({
			name: "atlassian",
			transport: {
				type: "streamableHttp",
				url: authorization
					? ATLASSIAN_STATIC_AUTH_MCP_URL
					: ATLASSIAN_OAUTH_MCP_URL,
				...(authorization
					? {
							headers: {
								Authorization: authorization,
							},
						}
					: {}),
			},
		})
	},
}

export default plugin
