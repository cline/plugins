# Circle

Circle adds the Circle MCP server plus Cline skills for building USDC, wallet, Gateway, CCTP, x402, Arc, and smart contract workflows with conservative handling of funds and credentials.

## Cline Primitives

- `mcp`: registers Circle's codegen and documentation MCP server as `circle-codegen` at `https://api.circle.com/v1/codegen/mcp`. Interactive Cline sessions may prompt for MCP OAuth authorization before live access.
- `skills`: 16 workflow skills cover Circle setup, USDC, CCTP, wallet selection, developer-controlled wallets, user-controlled wallets, modular wallets, agent-wallet CLI flows, x402 paid services, Gateway, unified balance, swaps, smart contracts, and Arc. Several skills include bundled reference files for implementation-specific flows.

## Install

```bash
cline plugin install circle
```

For local development from this repository:

```bash
cline plugin install ./plugins/circle --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Help me choose the right Circle wallet model for a USDC payout product and draft the integration plan.
```

## Requirements

- Circle account, API credentials, or Console configuration for API-backed wallet and smart contract workflows.
- Circle CLI installed locally for agent-wallet, x402, and CLI-driven operations.
- Explicit approval before Cline creates wallets, moves funds, signs messages or transactions, performs paid x402 calls, deploys contracts, or changes spending policies.
- The user accepts Circle terms and privacy policies directly in their own terminal or Circle UI.
- User-managed secret storage for API keys, entity secrets, kit keys, private keys, and recovery material.

## Trust Boundaries

Circle workflows may touch real USDC, wallet credentials, personal account data, paid APIs, and mainnet smart contracts. This plugin is designed to help Cline plan, inspect, generate code, and run approved commands, not to autonomously spend funds or accept agreements. If a user already has a manual MCP server named `circle-codegen`, Cline keeps that server and skips the plugin-owned registration until the manual entry is renamed or removed.
