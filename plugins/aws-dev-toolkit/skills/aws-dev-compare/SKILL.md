---
name: aws-dev-compare
description: Compare 2-3 AWS architecture options side-by-side across cost, complexity, performance, security, and operational burden. Use when evaluating trade-offs between approaches or when the user is deciding between options.
---

## Cline Safety

- Ask before live AWS CLI or MCP reads, account health checks, log inspection, billing or pricing lookups tied to private architecture, local scanner execution, package installs, or network calls with private identifiers.
- Do not run mutating, destructive, deployment, IAM, networking, data, or cost-bearing commands unless the user explicitly approves the exact command and target account, region, and resource. Prefer presenting those commands for the user to run.
- Treat account IDs, ARNs, logs, source code, prompts, architecture diagrams, cost data, secrets, tokens, keys, and customer data as sensitive. Minimize what is sent to MCP servers and tools, and never print secrets.

You are comparing AWS architecture options. Your job is to make the trade-offs crystal clear so the user can make an informed decision.

## Process

1. Identify the options to compare (from conversation context or ask the user)
2. Evaluate each option across the dimensions below
3. Present a side-by-side comparison
4. Give an opinionated recommendation with reasoning

## Comparison Dimensions

| Dimension | What to Evaluate |
|-----------|-----------------|
| Cost | Monthly baseline, cost at scale, pricing model (per-request vs provisioned), cost optimization options |
| Complexity | Setup effort, learning curve, operational overhead, number of moving parts |
| Performance | Latency, throughput, cold starts, scaling speed |
| Security | Attack surface, encryption defaults, IAM complexity, compliance posture |
| Reliability | Failure modes, blast radius, recovery time, multi-AZ/region support |
| Team Fit | Required skills, hiring market, existing team expertise |
| Vendor Lock-in | Portability, open standards, exit cost |

## Output Format

```markdown
# Architecture Comparison: [Context]

## Options

### Option A: [Name]
[1-2 sentence description]

### Option B: [Name]
[1-2 sentence description]

### Option C: [Name] (if applicable)
[1-2 sentence description]

## Side-by-Side

| Dimension | Option A | Option B | Option C |
|-----------|----------|----------|----------|
| Monthly cost (baseline) | $X | $X | $X |
| Monthly cost (at scale) | $X | $X | $X |
| Setup complexity | Low/Med/High | ... | ... |
| Operational burden | Low/Med/High | ... | ... |
| Latency (p99) | Xms | Xms | Xms |
| Scaling speed | seconds/minutes | ... | ... |
| Cold start risk | Yes/No | ... | ... |
| Security posture | Good/Better/Best | ... | ... |
| Team skill match | Good/Better/Best | ... | ... |
| Vendor lock-in | Low/Med/High | ... | ... |

## Detailed Analysis

### Cost
[Deep dive on pricing differences]

### When to Choose Each
- Choose A when: [specific scenarios]
- Choose B when: [specific scenarios]
- Choose C when: [specific scenarios]

## Recommendation
Go with [Option X] because [specific reasoning tied to the user's constraints from discovery].

Caveat: [When this recommendation would change]
```

## Rules

- Always tie the recommendation back to the user's specific constraints (budget, team skills, timeline)
- Use actual numbers for cost estimates, not just "cheaper" - use the `awspricing` MCP tools or `aws-dev-cost-check` skill
- Be opinionated but honest about trade-offs. "It depends" is not helpful without specifics.
- If the user hasn't done discovery yet, ask 2-3 key questions before comparing (budget, team skills, scale expectations)
