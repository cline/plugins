import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "coderabbit",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
