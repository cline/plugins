import type { AgentPlugin } from "@cline/sdk"

const PLUGIN_NAME = "oracle-aidp-connectors"

const plugin: AgentPlugin = {
	name: PLUGIN_NAME,
	manifest: {
		capabilities: ["skills"],
	},
}

export default plugin
