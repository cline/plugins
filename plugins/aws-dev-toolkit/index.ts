import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "aws-dev-toolkit",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "awsknowledge",
			transport: {
				type: "streamableHttp",
				url: "https://knowledge-mcp.global.api.aws",
			},
		})

		api.registerMcpServer({
			name: "awsiac",
			transport: {
				type: "stdio",
				command: "uvx",
				args: ["awslabs.aws-iac-mcp-server@1.0.19"],
			},
			env: {
				FASTMCP_LOG_LEVEL: "ERROR",
			},
		})

		api.registerMcpServer({
			name: "awspricing",
			transport: {
				type: "stdio",
				command: "uvx",
				args: ["awslabs.aws-pricing-mcp-server@1.0.31"],
			},
			env: {
				FASTMCP_LOG_LEVEL: "ERROR",
			},
		})
	},
}

export default plugin
