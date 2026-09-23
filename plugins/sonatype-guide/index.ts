import type { AgentPlugin } from "@cline/sdk"

const SONATYPE_GUIDE_MCP_URL = "https://mcp.guide.sonatype.com/mcp"

const plugin: AgentPlugin = {
	name: "sonatype-guide",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		const token = process.env.SONATYPE_GUIDE_TOKEN?.trim()

		if (token) {
			api.registerMcpServer({
				name: "sonatype-guide",
				transport: {
					type: "streamableHttp",
					url: SONATYPE_GUIDE_MCP_URL,
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			})
		}
	},
}

export default plugin
