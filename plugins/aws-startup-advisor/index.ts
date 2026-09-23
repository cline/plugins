import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "aws-startup-advisor",
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
			name: "awspricing",
			transport: {
				type: "stdio",
				command: "uvx",
				args: ["awslabs.aws-pricing-mcp-server@1.0.31"],
			},
			env: {
				FASTMCP_LOG_LEVEL: "ERROR",
				AWS_REGION: "us-east-1",
			},
		})
	},
}

export default plugin
