#!/usr/bin/env node
// Nautica Subgraph MCP server.
//
// Exposes the live Nautica subgraph (The Graph, indexing the NauticaQuests contract
// on Base) as MCP tools, so any MCP client (Claude Desktop, an agent) can read the
// on-chain game state in natural language - leaderboard, a player's sightings, the
// per-species aggregates, or an arbitrary GraphQL query. This is the "AI agent uses
// The Graph as its live data source" surface, made standard via MCP.
//
// Usage (stdio):  SUBGRAPH_URL=<studio query url> node subgraph-mcp.mjs

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const SUBGRAPH_URL =
  process.env.SUBGRAPH_URL || "https://api.studio.thegraph.com/query/114962/nautica/v0.0.2";

export async function querySubgraph(query, variables = {}) {
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.SUBGRAPH_API_KEY ? { Authorization: `Bearer ${process.env.SUBGRAPH_API_KEY}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const LEADERBOARD = /* GraphQL */ `
  query ($first: Int!) { players(orderBy: xp, orderDirection: desc, first: $first) {
    id handle xp streak sightingCount balanceUsd } }`;
const PLAYER = /* GraphQL */ `
  query ($id: ID!) { player(id: $id) {
    id handle wallet xp streak sightingCount balanceUsd
    sightings(orderBy: at, orderDirection: desc, first: 50) { species title xp lat lng at }
  } }`;
const SPECIES = /* GraphQL */ `
  query ($species: String!) { sightings(where: { species: $species }, orderBy: at, orderDirection: desc) {
    id lat lng at player { id } } }`;
const STATS = /* GraphQL */ `
  { global(id: "global") { totalPlayers totalSightings totalXp totalUsdc }
    speciesStats(orderBy: count, orderDirection: desc) { id count totalXp firstSeen lastSeen } }`;

const TOOLS = [
  {
    name: "nautica_leaderboard",
    description: "Top Nautica players by XP (on-chain leaderboard from the subgraph).",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "How many players (default 20)." } },
    },
    run: (a) => querySubgraph(LEADERBOARD, { first: a.limit ?? 20 }),
  },
  {
    name: "nautica_player",
    description: "A player's profile and recent sightings, keyed by lowercased wallet address.",
    inputSchema: {
      type: "object",
      properties: { wallet: { type: "string", description: "0x-prefixed wallet address." } },
      required: ["wallet"],
    },
    run: (a) => querySubgraph(PLAYER, { id: String(a.wallet).toLowerCase() }),
  },
  {
    name: "nautica_species_sightings",
    description: "All recorded sightings of a species (id, coordinates, time, player).",
    inputSchema: {
      type: "object",
      properties: {
        species: {
          type: "string",
          description: "SpeciesId, e.g. Lionfish, Jellyfish, Crab, ShorePlant, SeaStar, Turtle, Physalia, ShoreFish, Other.",
        },
      },
      required: ["species"],
    },
    run: (a) => querySubgraph(SPECIES, { species: a.species }),
  },
  {
    name: "nautica_global_stats",
    description: "Protocol totals and per-species aggregates (counts, XP, first/last seen).",
    inputSchema: { type: "object", properties: {} },
    run: () => querySubgraph(STATS),
  },
  {
    name: "nautica_query",
    description: "Run an arbitrary read-only GraphQL query against the Nautica subgraph.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "A GraphQL query string." },
        variables: { type: "object", description: "Optional query variables." },
      },
      required: ["query"],
    },
    run: (a) => querySubgraph(a.query, a.variables ?? {}),
  },
];

async function main() {
  const server = new Server({ name: "nautica-subgraph", version: "0.1.0" }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = TOOLS.find((t) => t.name === req.params.name);
    if (!tool) return { isError: true, content: [{ type: "text", text: `unknown tool: ${req.params.name}` }] };
    try {
      const data = await tool.run(req.params.arguments ?? {});
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `query failed: ${String(err)}` }] };
    }
  });

  await server.connect(new StdioServerTransport());
  console.error(`nautica-subgraph MCP server on stdio → ${SUBGRAPH_URL}`);
}

// Only start the transport when run directly (keeps querySubgraph importable for tests).
if (process.argv[1] && process.argv[1].endsWith("subgraph-mcp.mjs")) main();
