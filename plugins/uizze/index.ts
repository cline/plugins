import { type AgentPlugin, createTool } from "@cline/sdk"

const uizzeConnectionInfoTool = createTool({
	name: "uizze_connection_info",
	description:
		"Return read-only setup guidance for the optional authenticated UIZZE MCP. Use only when the user asks to connect UIZZE or automate the free anti-ui-slop workflow.",
	inputSchema: {
		type: "object",
		properties: {},
		additionalProperties: false,
	},
	execute: async () => {
		return {
			freeSkill: "anti-ui-slop",
			website: "https://uizze.com",
			mcpEndpoint: "https://uizze.com/mcp",
			transport: "http",
			authentication: "Authorization: Bearer YOUR_UIZZE_TOKEN",
			setup: [
				"Use Connect at https://uizze.com to obtain your own UIZZE token.",
				"Configure a Streamable HTTP MCP server named uizze at https://uizze.com/mcp.",
				"Set its Authorization header to Bearer followed by your token in your local Cline MCP configuration.",
				"Never paste the token into chat, source control, plugin files, or issue reports.",
			],
			note: "The bundled anti-ui-slop skill and public catalogue workflow work without the MCP or a token.",
			performsNetworkRequests: false,
			readsOrStoresCredentials: false,
		}
	},
})

const plugin: AgentPlugin = {
	name: "uizze",
	manifest: {
		capabilities: ["tools"],
	},

	setup(api) {
		api.registerTool(uizzeConnectionInfoTool)
	},
}

export default plugin
