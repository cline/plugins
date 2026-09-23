import type { AgentPlugin } from "@cline/sdk"

const mcpServers = [
	{
		name: "cloudinary-asset-mgmt",
		description: "Upload, manage, search, and transform Cloudinary media assets.",
		transport: {
			type: "streamableHttp",
			url: "https://asset-management.mcp.cloudinary.com/mcp",
		},
	},
	{
		name: "cloudinary-env-config",
		description: "Inspect and configure Cloudinary environment settings.",
		transport: {
			type: "streamableHttp",
			url: "https://environment-config.mcp.cloudinary.com/mcp",
		},
	},
	{
		name: "cloudinary-smd",
		description: "Work with Cloudinary structured metadata definitions and values.",
		transport: {
			type: "streamableHttp",
			url: "https://structured-metadata.mcp.cloudinary.com/mcp",
		},
	},
	{
		name: "cloudinary-analysis",
		description: "Analyze Cloudinary images and videos with Cloudinary AI tools.",
		transport: {
			type: "sse",
			url: "https://analysis.mcp.cloudinary.com/sse",
		},
	},
] as const

const plugin: AgentPlugin = {
	name: "cloudinary",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		for (const server of mcpServers) {
			api.registerMcpServer({
				name: server.name,
				transport: server.transport,
				metadata: {
					description: server.description,
				},
			})
		}
	},
}

export default plugin
