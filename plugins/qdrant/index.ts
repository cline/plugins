import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "qdrant",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
