import type { AgentPlugin } from "@cline/sdk"

const SITE_DOMAINS: Record<string, string> = {
	us1: "mcp.datadoghq.com",
	"datadoghq.com": "mcp.datadoghq.com",
	"app.datadoghq.com": "mcp.datadoghq.com",
	us3: "mcp.us3.datadoghq.com",
	"us3.datadoghq.com": "mcp.us3.datadoghq.com",
	us5: "mcp.us5.datadoghq.com",
	"us5.datadoghq.com": "mcp.us5.datadoghq.com",
	eu: "mcp.datadoghq.eu",
	"datadoghq.eu": "mcp.datadoghq.eu",
	"app.datadoghq.eu": "mcp.datadoghq.eu",
	ap1: "mcp.ap1.datadoghq.com",
	"ap1.datadoghq.com": "mcp.ap1.datadoghq.com",
	ap2: "mcp.ap2.datadoghq.com",
	"ap2.datadoghq.com": "mcp.ap2.datadoghq.com",
}

function normalizeDomain(value: string | undefined): string | undefined {
	const trimmed = value?.trim()
	if (!trimmed) {
		return undefined
	}
	return trimmed
		.replace(/^https?:\/\//i, "")
		.replace(/\/.*$/, "")
		.toLowerCase()
}

function resolveDatadogMcpDomain(): string {
	const explicit = normalizeDomain(process.env.DD_MCP_DOMAIN)
	if (explicit) {
		if (!/^[a-z0-9.-]+$/.test(explicit) || !explicit.includes(".")) {
			throw new Error(
				`Invalid DD_MCP_DOMAIN "${process.env.DD_MCP_DOMAIN}". Use a domain like mcp.datadoghq.com without a path.`,
			)
		}
		return explicit
	}

	const site = normalizeDomain(process.env.DD_SITE)
	if (site && SITE_DOMAINS[site]) {
		return SITE_DOMAINS[site]
	}
	if (site) {
		throw new Error(
			`Unsupported DD_SITE "${process.env.DD_SITE}". Use us1, us3, us5, eu, ap1, ap2, a Datadog site host, or DD_MCP_DOMAIN.`,
		)
	}

	return SITE_DOMAINS.us1
}

function buildDatadogMcpUrl(): string {
	const url = new URL(
		`https://${resolveDatadogMcpDomain()}/api/unstable/mcp-server/mcp`,
	)
	url.searchParams.set("referrer_ide", "cline-plugin")

	const toolsets = process.env.DD_MCP_TOOLSETS?.trim()
	if (toolsets) {
		url.searchParams.set("toolsets", toolsets)
	}

	return url.toString()
}

const plugin: AgentPlugin = {
	name: "datadog",
	manifest: {
		capabilities: ["mcp", "skills"],
	},

	setup(api) {
		api.registerMcpServer({
			name: "datadog",
			transport: {
				type: "streamableHttp",
				url: buildDatadogMcpUrl(),
			},
			metadata: {
				description:
					"Query Datadog logs, metrics, traces, dashboards, monitors, incidents, and related observability data.",
			},
		})
	},
}

export default plugin
