import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "datarobot",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
