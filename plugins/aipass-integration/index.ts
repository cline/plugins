import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "aipass-integration",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
