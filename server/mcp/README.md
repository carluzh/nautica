# Nautica Subgraph MCP server

Exposes the live Nautica subgraph (The Graph, indexing the `NauticaQuests` contract
on Base Sepolia) as [MCP](https://modelcontextprotocol.io) tools, so any MCP client
— Claude Desktop, an agent loop — can read the on-chain game state in natural
language. This is the "AI agent uses The Graph as its live data source" surface,
standardized via MCP.

## Tools

- `nautica_leaderboard(limit?)` — top players by XP.
- `nautica_player(wallet)` — a player's profile + recent sightings.
- `nautica_species_sightings(species)` — every sighting of a species.
- `nautica_global_stats()` — protocol totals + per-species aggregates.
- `nautica_query(query, variables?)` — arbitrary read-only GraphQL.

## Run

```bash
cd server/mcp
npm install
SUBGRAPH_URL=https://api.studio.thegraph.com/query/114962/nautica/v0.0.2 node subgraph-mcp.mjs
```

`SUBGRAPH_URL` defaults to the deployed Studio endpoint if unset;
`SUBGRAPH_API_KEY` is sent as a bearer token when set (decentralized-network gateway).

## Connect from Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nautica-subgraph": {
      "command": "node",
      "args": ["/absolute/path/to/nautica/server/mcp/subgraph-mcp.mjs"],
      "env": { "SUBGRAPH_URL": "https://api.studio.thegraph.com/query/114962/nautica/v0.0.2" }
    }
  }
}
```

Then ask Claude things like "Who's on the Nautica leaderboard?" or "Where have
lionfish been sighted?" — it calls these tools, which query The Graph live.

The plausibility agent (`server/src/services/plausibility.ts`) reasons over the same
subgraph; this server makes that data queryable by any external agent too.
