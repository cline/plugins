import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "forge",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "forge",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.atlassian.com/v1/forge/mcp",
			},
			metadata: {
				description:
					"Access current Atlassian Forge documentation, templates, module guidance, manifest references, UI Kit guidance, and backend API guidance.",
			},
		})

		api.registerMcpServer({
			name: "atlassian-design-system",
			transport: {
				type: "streamableHttp",
				url: "https://mcp.atlassian.com/v1/ads/public/mcp",
			},
			metadata: {
				description:
					"Look up Atlassian Design System components, tokens, icons, and Custom UI design guidance.",
			},
		})
	},
}

export default plugin
