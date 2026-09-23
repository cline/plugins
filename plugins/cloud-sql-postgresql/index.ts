import type { AgentPlugin } from "@cline/sdk"

const plugin: AgentPlugin = {
	name: "cloud-sql-postgresql",
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
