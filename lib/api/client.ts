// Typed client for the Nautica backend (server/). This is the ONLY place the
// frontend talks to the server. The GameProvider uses it in "API mode"; when
// NEXT_PUBLIC_API_URL is unset the app stays in self-contained "mock mode" so the
// frontend runs with no backend at all.
//
// Contract note: the response shapes below are the frozen seam between frontend
// and backend. Keep them in sync with server/src/types.ts.

import type {
  ActivityEvent,
  GalleryItem,
  LeaderboardEntry,
  LevelInfo,
  Payment,
  Quest,
  QuestStatus,
  SubmitResult,
  Verification,
} from "@/lib/game/types";

const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

/** True when a backend URL is configured — the provider runs in API mode. */
export const apiEnabled = Boolean(BASE);

// ---- Response shapes (mirror server/src/types.ts) ---------------------------

export type ApiProfile = {
  userId: string;
  handle: string;
  wallet: string | null;
  xp: number;
  level: number;
  streak: number;
  verification: Verification;
  balanceUsd: number;
};

export type WorldProof = {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: "device" | "document" | "secure_document" | "orb";
};

export type LoginResponse = { token: string; profile: ApiProfile; simulated: boolean };
export type QuestsResponse = { quests: (Quest & { status: QuestStatus })[]; paidUnlocked: boolean };
export type ChallengeResponse = { nonce: string; expiresAt: number };

export class ApiError extends Error {}

async function req<T>(
  path: string,
  opts: { method?: string; token?: string | null; body?: unknown } = {},
): Promise<T> {
  if (!BASE) throw new ApiError("NEXT_PUBLIC_API_URL is not set");
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const msg = (data as { error?: string })?.error ?? `request failed (${res.status})`;
    throw new ApiError(msg);
  }
  return data as T;
}

/**
 * Dev proof for local login without IDKit. The backend accepts it in dev-mock
 * mode (WORLD_APP_ID unset). Swap this for a real @worldcoin/idkit proof once an
 * App ID exists — see lib/api/README.md.
 */
export function devProof(level: WorldProof["verification_level"] = "device"): WorldProof {
  const rand = Math.random().toString(16).slice(2, 10);
  return {
    proof: `0xdev${rand}`,
    merkle_root: `0xroot${rand}`,
    nullifier_hash: `0xnull_${rand}`,
    verification_level: level,
  };
}

export const api = {
  loginWorldId(proof: WorldProof, action?: string) {
    return req<LoginResponse>("/auth/worldid", { method: "POST", body: { proof, action } });
  },
  verifyTier(token: string, proof: WorldProof, action?: string) {
    return req<{ tier: string; profile: ApiProfile }>("/auth/verify", {
      method: "POST",
      token,
      body: { proof, action },
    });
  },
  getQuests(token: string) {
    return req<QuestsResponse>("/quests", { token });
  },
  challenge(token: string, questId: string) {
    return req<ChallengeResponse>(`/quests/${questId}/challenge`, { method: "POST", token });
  },
  submit(
    token: string,
    questId: string,
    body: { imageDataUrl: string; nonce: string; lat?: number; lng?: number },
  ) {
    // Submit always returns 200 with a SubmitResult (ok:true or ok:false).
    return req<SubmitResult>(`/quests/${questId}/submit`, { method: "POST", token, body });
  },
  getMe(token: string) {
    return req<ApiProfile>("/me", { token });
  },
  getGallery(token: string) {
    return req<GalleryItem[]>("/me/gallery", { token });
  },
  getActivity(token: string) {
    return req<ActivityEvent[]>("/me/activity", { token });
  },
  getPayments(token: string) {
    return req<Payment[]>("/me/payments", { token });
  },
  getLeaderboard(token: string | null) {
    return req<LeaderboardEntry[]>("/leaderboard", { token });
  },
};

/** Session token persistence (client-only). */
const TOKEN_KEY = "nautica.session";
export const sessionToken = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
  },
};

export type { LevelInfo };
