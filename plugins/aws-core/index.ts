import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "aws-core",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "aws-mcp",
			transport: {
				type: "stdio",
				command: "uvx",
				args: [
					"mcp-proxy-for-aws@1.6.0",
					"https://aws-mcp.us-east-1.api.aws/mcp",
					"--skip-auth",
					"--metadata",
					"INSTALL_SOURCE=cline-plugin",
				],
			},
		})
	},
}

export default plugin
