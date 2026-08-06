import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "jfrog",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
