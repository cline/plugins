import type { AgentPlugin } from "@cline/sdk"

const DEFAULT_AWS_REGION = "us-east-1"

const plugin: AgentPlugin = {
	name: "amazon-location-service",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		const operationRegion =
			process.env.AWS_REGION?.trim() ||
			process.env.AWS_DEFAULT_REGION?.trim() ||
			DEFAULT_AWS_REGION

		api.registerMcpServer({
			name: "aws-mcp",
			transport: {
				type: "stdio",
				command: "uvx",
				args: [
					"mcp-proxy-for-aws==1.6.1",
					"https://aws-mcp.us-east-1.api.aws/mcp",
					"--metadata",
					`AWS_REGION=${operationRegion}`,
				],
			},
		})
	},
}

export default plugin
