import type { AgentPlugin } from "@cline/sdk"

function sourcegraphMcpUrl(endpoint: string): string {
	const trimmed = endpoint.trim().replace(/\/+$/, "")
	if (!trimmed) {
		throw new Error("SOURCEGRAPH_ENDPOINT is empty")
	}
	return new URL(`${trimmed}/.api/mcp`).toString()
}

const plugin: AgentPlugin = {
	name: "sourcegraph",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		const endpoint = process.env.SOURCEGRAPH_ENDPOINT?.trim()
		const token = process.env.SOURCEGRAPH_ACCESS_TOKEN?.trim()

		if (endpoint && token) {
			api.registerMcpServer({
				name: "sourcegraph",
				transport: {
					type: "streamableHttp",
					url: sourcegraphMcpUrl(endpoint),
					headers: {
						Authorization: `token ${token}`,
					},
				},
			})
		}
	},
}

export default plugin
