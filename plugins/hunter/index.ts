import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "hunter",
	manifest: {
		capabilities: ["skills", "mcp"],
	},
	setup(api) {
		api.registerMcpServer({
			name: "hunter",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.hunter.io/mcp",
			},
			metadata: {
				displayName: "Hunter",
				description:
					"Find, verify, enrich, and organize professional contacts for B2B prospecting workflows.",
				requiresAuthentication: true,
			},
		})
	},
}

export default plugin
