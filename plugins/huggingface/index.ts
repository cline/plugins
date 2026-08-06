import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "huggingface",
	manifest: {
		capabilities: ["skills", "mcp"],
	},
	setup(api) {
		api.registerMcpServer({
			name: "huggingface",
			transport: {
				type: "streamableHttp",
				url: "https://huggingface.co/mcp?login",
			},
			metadata: {
				displayName: "Hugging Face",
				description:
					"Access Hugging Face Hub workflows for models, datasets, Spaces, papers, and related AI/ML tasks.",
				requiresAuthentication: true,
			},
		})
	},
}

export default plugin
