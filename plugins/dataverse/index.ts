import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "dataverse",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
