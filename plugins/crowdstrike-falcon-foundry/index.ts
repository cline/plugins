import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "crowdstrike-falcon-foundry",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
