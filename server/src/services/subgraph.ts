import { config, integrations } from "../config";
import { levelForXp } from "../lib/levels";
import { log } from "../lib/logger";
import { store, type UserRecord } from "../lib/store";
import type { ActivityEvent, GalleryItem, LeaderboardEntry, Profile } from "../types";

// Broker between the frontend and The Graph. WHILE the subgraph is undeployed it
// derives everything from the local store (the routes' write target), so the
// frontend contract is identical now and after go-live. When SUBGRAPH_URL is set
// it queries the deployed subgraph instead. The GraphQL below documents the
// on-chain event schema the subgraph is expected to index (quest completions,
// XP, level-ups, payouts).

const PLAYER_QUERY = /* GraphQL */ `
  query Player($id: ID!) {
    player(id: $id) {
      id
      handle
      wallet
      xp
      streak
      balanceUsd
      faceVerified
      passportVerified
      orbVerified
      sightings(orderBy: at, orderDirection: desc, first: 100) {
        id questId species title xp usdc lat lng at
        attestation { model verdict confidence label tee hash at }
      }
      activity(orderBy: at, orderDirection: desc, first: 100) {
        id kind title detail xp usdc species at
      }
    }
  }
`;

const LEADERBOARD_QUERY = /* GraphQL */ `
  query Leaderboard($first: Int!) {
    players(orderBy: xp, orderDirection: desc, first: $first) {
      id handle xp
    }
  }
`;

async function query<T>(q: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(config.SUBGRAPH_URL as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.SUBGRAPH_API_KEY ? { Authorization: `Bearer ${config.SUBGRAPH_API_KEY}` } : {}),
    },
    body: JSON.stringify({ query: q, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (!res.ok || json.errors || !json.data) {
    throw new Error(`subgraph query failed: ${JSON.stringify(json.errors ?? res.status)}`);
  }
  return json.data;
}

function profileFromRecord(u: UserRecord): Profile {
  return {
    userId: u.userId,
    handle: u.handle,
    wallet: u.wallet,
    xp: u.xp,
    level: levelForXp(u.xp),
    streak: u.streak,
    verification: u.verification,
    balanceUsd: u.balanceUsd,
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!integrations.subgraph) {
    const u = store.getUser(userId);
    return u ? profileFromRecord(u) : null;
  }
  try {
    const data = await query<{ player: null | Record<string, unknown> }>(PLAYER_QUERY, { id: userId });
    if (!data.player) return null;
    const p = data.player as Record<string, unknown>;
    return {
      userId: String(p.id),
      handle: String(p.handle ?? ""),
      wallet: (p.wallet as string) ?? null,
      xp: Number(p.xp ?? 0),
      level: levelForXp(Number(p.xp ?? 0)),
      streak: Number(p.streak ?? 0),
      verification: {
        face: Boolean(p.faceVerified),
        passport: Boolean(p.passportVerified),
        orb: Boolean(p.orbVerified),
      },
      balanceUsd: Number(p.balanceUsd ?? 0),
    };
  } catch (err) {
    log.error("subgraph: getProfile failed", { err: String(err) });
    return null;
  }
}

export async function getGallery(userId: string): Promise<GalleryItem[]> {
  if (!integrations.subgraph) return store.getUser(userId)?.gallery ?? [];
  const data = await query<{ player: { sightings: GalleryItem[] } | null }>(PLAYER_QUERY, { id: userId });
  return data.player?.sightings ?? [];
}

export async function getActivity(userId: string): Promise<ActivityEvent[]> {
  if (!integrations.subgraph) return store.getUser(userId)?.activity ?? [];
  const data = await query<{ player: { activity: ActivityEvent[] } | null }>(PLAYER_QUERY, { id: userId });
  return data.player?.activity ?? [];
}

export async function getLeaderboard(userId: string | null, limit = 20): Promise<LeaderboardEntry[]> {
  if (!integrations.subgraph) {
    return store
      .allUsers()
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit)
      .map((u, i) => ({
        rank: i + 1,
        handle: u.handle,
        xp: u.xp,
        level: levelForXp(u.xp),
        you: u.userId === userId,
      }));
  }
  const data = await query<{ players: { id: string; handle: string; xp: number }[] }>(LEADERBOARD_QUERY, {
    first: limit,
  });
  return data.players.map((p, i) => ({
    rank: i + 1,
    handle: p.handle,
    xp: Number(p.xp),
    level: levelForXp(Number(p.xp)),
    you: p.id === userId,
  }));
}
