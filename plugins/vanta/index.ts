import type { AgentPlugin } from "@cline/sdk"

const PLUGIN_NAME = "vanta"

const plugin: AgentPlugin = {
	name: PLUGIN_NAME,
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		for (const server of [
			["vanta-us", "https://mcp.vanta.com/mcp"],
			["vanta-eu", "https://mcp.eu.vanta.com/mcp"],
			["vanta-aus", "https://mcp.aus.vanta.com/mcp"],
		] as const) {
			api.registerMcpServer({
				name: server[0],
				transport: {
					type: "streamableHttp",
					url: server[1],
				},
			})
		}
	},
}

export default plugin
