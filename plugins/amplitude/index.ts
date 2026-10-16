import type { AgentPlugin } from "@cline/sdk"

const AMPLITUDE_MCP_URLS = {
	us: "https://mcp.amplitude.com/mcp?discovery=progressive",
	eu: "https://mcp.eu.amplitude.com/mcp?discovery=progressive",
} as const

function resolveAmplitudeMcpUrl(): string {
	const region = process.env.AMPLITUDE_MCP_REGION?.trim().toLowerCase() || "us"

	if (region !== "us" && region !== "eu") {
		throw new Error('AMPLITUDE_MCP_REGION must be "us" or "eu"')
	}

	return AMPLITUDE_MCP_URLS[region]
}

const plugin: AgentPlugin = {
	name: "amplitude",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "amplitude",
			transport: {
				type: "streamableHttp",
				url: resolveAmplitudeMcpUrl(),
			},
		})
	},
}

export default plugin
