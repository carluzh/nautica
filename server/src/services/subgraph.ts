import { config, integrations } from "../config";
import { questRegistry } from "../lib/quest-registry";
import { levelForXp } from "../lib/levels";
import { log } from "../lib/logger";
import { store, type UserRecord } from "../lib/store";
import { getSightingImage, getSightingImageRoot, getSightingRadius } from "./sighting-meta";
import type {
  ActivityEvent,
  Attestation,
  GalleryItem,
  LeaderboardEntry,
  Profile,
  SpeciesId,
} from "../types";

// Broker between the frontend and The Graph. While SUBGRAPH_URL is unset it derives
// everything from the local store, so the frontend contract is identical before and
// after go-live; when set it queries the deployed subgraph (../../subgraph).
//
// The subgraph is address-keyed (Player.id = lowercased wallet) while the app keys
// users by internal userId, so real-mode reads resolve userId -> wallet via the
// store and overlay the off-chain identity (handle, verification) the chain lacks.

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
        attestation { hash verdict label at }
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

// Single sighting by id — the plausibility agent's read-back path (it reasons only
// over what it reads out of The Graph, never over the submit closure).
const SIGHTING_QUERY = /* GraphQL */ `
  query Sighting($id: ID!) {
    sighting(id: $id) {
      id questId species title xp usdc lat lng at
      player { id }
      attestation { hash verdict label at }
    }
  }
`;

// Community corroboration: other recorded sightings of the same species.
const SPECIES_SIGHTINGS_QUERY = /* GraphQL */ `
  query SpeciesSightings($species: String!, $first: Int!) {
    sightings(where: { species: $species }, orderBy: at, orderDirection: desc, first: $first) {
      id species lat lng at
    }
  }
`;

/** A lightweight point read used by the plausibility agent's corroboration check. */
export type SightingPoint = { id: string; species: SpeciesId; lat: number; lng: number; at: number };

// On-chain quest state keyed by app questId (subgraph Quest.id === "q-paid-lionfish").
// exists=false means the Quest was never createQuest'd -> recordCompletion reverts
// QuestNotFound. v0.0.4 exposes only `funded` (the REMAINING escrow). underfunded =
// the pool can't cover one more payout.
export type OnchainQuest = {
  exists: boolean;
  remainingUsd: number; // funded (remaining escrow) -> the "$X left"
  underfunded: boolean; // funded < usdcReward (paid only)
  createdAt: number;    // epoch ms
};

const QUESTS_QUERY = /* GraphQL */ `
  query Quests($first: Int!) {
    quests(first: $first) {
      id
      usdcReward
      funded
      createdAt
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

/** userId -> lowercased wallet (the subgraph's Player id), or null if none attached yet. */
function walletKey(userId: string): string | null {
  const w = store.getUser(userId)?.wallet;
  return w ? w.toLowerCase() : null;
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

// The subgraph serializes BigInt/BigDecimal as JSON strings; these coerce them back
// to the `number` fields the frontend contract expects. Timestamps are Unix seconds
// on-chain, so `at` is scaled to the epoch-ms the whole app (and timeAgo) assumes.
const toMs = (v: unknown): number => Number(v ?? 0) * 1000;

function normalizeAttestation(a: Record<string, unknown> | null | undefined): Attestation {
  return {
    model: String(a?.model ?? ""),
    verdict: a?.verdict === "fail" ? "fail" : "pass",
    confidence: a?.confidence != null ? Number(a.confidence) : 0,
    label: String(a?.label ?? ""),
    tee: String(a?.tee ?? ""),
    hash: String(a?.hash ?? ""),
    simulated: false, // on-chain attestations are real records, never the 0G stub
    at: toMs(a?.at),
  };
}

function normalizeSighting(s: Record<string, unknown>): GalleryItem {
  const id = String(s.id);
  // The subgraph mints sighting ids as `txHash-logIndex`, so the recording tx (and
  // its off-chain precision radius) can be recovered without a schema change.
  const txHash = id.includes("-") ? id.slice(0, id.indexOf("-")) : undefined;
  const imageId = txHash ? getSightingImage(txHash) : undefined;
  return {
    id,
    questId: String(s.questId),
    species: s.species as SpeciesId,
    title: String(s.title),
    photo: imageId ? `/images/${imageId}` : undefined,
    xp: Number(s.xp ?? 0),
    usdc: s.usdc != null && Number(s.usdc) > 0 ? Number(s.usdc) : undefined,
    lat: Number(s.lat ?? 0),
    lng: Number(s.lng ?? 0),
    radiusM: txHash ? getSightingRadius(txHash) : undefined,
    at: toMs(s.at),
    txHash,
    storageRoot: imageId ? getSightingImageRoot(imageId) : undefined,
    attestation: normalizeAttestation(s.attestation as Record<string, unknown>),
  };
}

function normalizeActivity(a: Record<string, unknown>): ActivityEvent {
  return {
    id: String(a.id),
    kind: a.kind as ActivityEvent["kind"],
    title: String(a.title),
    detail: a.detail != null ? String(a.detail) : undefined,
    xp: a.xp != null ? Number(a.xp) : undefined,
    usdc: a.usdc != null ? Number(a.usdc) : undefined,
    species: a.species != null ? (a.species as SpeciesId) : undefined,
    at: toMs(a.at),
  };
}

// ---- reads ------------------------------------------------------------------

export async function getProfile(userId: string): Promise<Profile | null> {
  const u = store.getUser(userId);
  if (!integrations.subgraph) {
    return u ? profileFromRecord(u) : null;
  }
  try {
    const wallet = u?.wallet ? u.wallet.toLowerCase() : null;
    // No on-chain identity yet, or not indexed yet: fall back to the store profile.
    if (!wallet) return u ? profileFromRecord(u) : null;
    const data = await query<{ player: null | Record<string, unknown> }>(PLAYER_QUERY, { id: wallet });
    if (!data.player) return u ? profileFromRecord(u) : null;
    const p = data.player;
    const xp = Number(p.xp ?? 0);
    return {
      userId, // keep the app userId as the profile id (frozen client contract)
      handle: u?.handle ?? String(p.handle ?? ""),
      wallet: u?.wallet ?? ((p.wallet as string) ?? null),
      xp,
      level: levelForXp(xp),
      streak: Number(p.streak ?? 0),
      // Verification is off-chain (World ID); the store is authoritative when present.
      verification: u?.verification ?? {
        face: Boolean(p.faceVerified),
        passport: Boolean(p.passportVerified),
        orb: Boolean(p.orbVerified),
      },
      balanceUsd: Number(p.balanceUsd ?? 0),
    };
  } catch (err) {
    log.error("subgraph: getProfile failed", { err: String(err) });
    return u ? profileFromRecord(u) : null;
  }
}

export async function getGallery(userId: string): Promise<GalleryItem[]> {
  if (!integrations.subgraph) return store.getUser(userId)?.gallery ?? [];
  const wallet = walletKey(userId);
  if (!wallet) return store.getUser(userId)?.gallery ?? [];
  const data = await query<{ player: { sightings: Record<string, unknown>[] } | null }>(PLAYER_QUERY, {
    id: wallet,
  });
  return (data.player?.sightings ?? []).map(normalizeSighting);
}

export async function getActivity(userId: string): Promise<ActivityEvent[]> {
  if (!integrations.subgraph) return store.getUser(userId)?.activity ?? [];
  const wallet = walletKey(userId);
  if (!wallet) return store.getUser(userId)?.activity ?? [];
  const data = await query<{ player: { activity: Record<string, unknown>[] } | null }>(PLAYER_QUERY, {
    id: wallet,
  });
  return (data.player?.activity ?? []).map(normalizeActivity);
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
  const wallet = userId ? walletKey(userId) : null;
  const data = await query<{ players: { id: string; handle: string; xp: number }[] }>(LEADERBOARD_QUERY, {
    first: limit,
  });
  return data.players.map((p, i) => ({
    rank: i + 1,
    handle: p.handle,
    xp: Number(p.xp),
    level: levelForXp(Number(p.xp)),
    you: wallet != null && p.id.toLowerCase() === wallet,
  }));
}

/** One sighting by id, scoped to the caller. The plausibility agent's read-back. */
export async function getSighting(userId: string, sightingId: string): Promise<GalleryItem | null> {
  if (!integrations.subgraph) {
    const u = store.getUser(userId);
    return u?.gallery.find((g) => g.id === sightingId) ?? null;
  }
  const wallet = walletKey(userId);
  // Fail closed: a caller with no wallet owns no on-chain sighting, so /me must
  // never resolve one for them (guards against reading another player's record).
  if (!wallet) return null;
  const data = await query<{ sighting: (Record<string, unknown> & { player?: { id?: string } }) | null }>(
    SIGHTING_QUERY,
    { id: sightingId },
  );
  const s = data.sighting;
  if (!s) return null;
  if (String(s.player?.id ?? "").toLowerCase() !== wallet) return null;
  return normalizeSighting(s);
}

/** All recorded sightings of a species — the corroboration signal for plausibility. */
export async function getSpeciesSightings(species: SpeciesId, limit = 500): Promise<SightingPoint[]> {
  if (!integrations.subgraph) {
    const points: SightingPoint[] = [];
    for (const u of store.allUsers()) {
      for (const g of u.gallery) {
        if (g.species === species) points.push({ id: g.id, species: g.species, lat: g.lat, lng: g.lng, at: g.at });
      }
    }
    return points.slice(0, limit);
  }
  const data = await query<{ sightings: Record<string, unknown>[] }>(SPECIES_SIGHTINGS_QUERY, {
    species,
    first: limit,
  });
  return (data.sightings ?? []).map((s) => ({
    id: String(s.id),
    species: s.species as SpeciesId,
    lat: Number(s.lat ?? 0),
    lng: Number(s.lng ?? 0),
    at: toMs(s.at),
  }));
}

/** On-chain quest state by app questId, merged catalog-driven downstream.
 *  Mock: every catalog quest is live + funded (paid pools = reward*2 for a tidy
 *  "$6 · $12 left" demo) so the pure-frontend/dev board stays fully tappable.
 *  Real: read the subgraph Quest entities; a catalog quest absent from the result
 *  is exists=false (not yet created). Fails OPEN to catalog-available on a subgraph
 *  error so an indexer blip never bricks the board. */
export async function getQuests(): Promise<Record<string, OnchainQuest>> {
  const mock = (): Record<string, OnchainQuest> =>
    Object.fromEntries(
      questRegistry.all().map((q) => {
        const reward = q.usdc ?? 0;
        return [q.id, { exists: true, remainingUsd: reward * 2, underfunded: false, createdAt: q.createdAt }];
      }),
    );
  if (!integrations.subgraph) return mock();
  try {
    const data = await query<{ quests: Record<string, unknown>[] }>(QUESTS_QUERY, { first: 100 });
    const out: Record<string, OnchainQuest> = {};
    for (const q of data.quests ?? []) {
      const reward = Number(q.usdcReward ?? 0);
      const funded = Number(q.funded ?? 0);
      out[String(q.id)] = {
        exists: true,
        remainingUsd: funded,
        underfunded: reward > 0 && funded < reward,
        createdAt: toMs(q.createdAt),
      };
    }
    return out; // catalog quests missing here -> exists:false when merged in the route
  } catch (err) {
    log.error("subgraph: getQuests failed", { err: String(err) });
    return mock(); // degrade to today's behavior, don't blank the board
  }
}
