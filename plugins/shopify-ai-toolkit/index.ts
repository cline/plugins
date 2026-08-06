import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "shopify-ai-toolkit",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
