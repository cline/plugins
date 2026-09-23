import type { AgentPlugin } from "@cline/sdk"

const awsRegion =
	process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim()

const plugin: AgentPlugin = {
	name: "sagemaker-ai",
	manifest: {
		capabilities: ["skills", "mcp"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "aws-mcp",
			transport: {
				type: "stdio",
				command: "uvx",
				args: [
					"mcp-proxy-for-aws@latest",
					"https://aws-mcp.us-east-1.api.aws/mcp",
				],
			},
			env: awsRegion
				? {
						AWS_REGION: awsRegion,
						AWS_DEFAULT_REGION: awsRegion,
					}
				: undefined,
			metadata: {
				description:
					"AWS documentation and standard operating procedure retrieval for SageMaker AI workflows.",
			},
		})
	},
}

export default plugin
