// Typed client for the Nautica backend (server/) - the only place the frontend
// talks to the server. GameProvider uses it in "API mode"; with NEXT_PUBLIC_API_URL
// unset the app falls back to self-contained "mock mode". The response shapes below
// are the frozen seam with the backend - keep them in sync with server/src/types.ts.

import type {
  ActivityEvent,
  GalleryItem,
  LeaderboardEntry,
  LevelInfo,
  PlausibilityVerdict,
  Quest,
  QuestStatus,
  SubmitResult,
} from "@/lib/game/types";

const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

/** True when a backend URL is configured - the provider runs in API mode. */
export const apiEnabled = Boolean(BASE);

/** Resolve a server-relative asset path (e.g. /images/<id>) to an absolute URL so
 *  <img> tags load from the API origin, not the Next app origin. */
export function assetUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return BASE ? `${BASE}${path}` : path;
}

export type ApiProfile = {
  userId: string;
  handle: string;
  wallet: string | null; // read-only derived on-chain address
  xp: number;
  level: number;
  streak: number;
};

export type LoginResponse = { token: string; profile: ApiProfile };
export type QuestsResponse = { quests: (Quest & { status: QuestStatus })[] };
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

export const api = {
  /** Guest sign-in: mints a fresh account + session (no credentials). */
  loginGuest() {
    return req<LoginResponse>("/auth/guest", { method: "POST" });
  },
  /** Email + password sign-in. Find-or-create: the same endpoint registers a new
   *  account or logs into an existing one (the UI toggle is cosmetic). Password is
   *  sent plaintext over HTTPS; the server hashes it with scrypt. */
  loginEmail(email: string, password: string) {
    return req<LoginResponse>("/auth/email", { method: "POST", body: { email, password } });
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
    body: {
      imageDataUrl: string;
      nonce: string;
      lat?: number;
      lng?: number;
      radiusM?: number;
      anchorLat?: number;
      anchorLng?: number;
    },
  ) {
    // Submit always returns 200 with a SubmitResult (ok:true or ok:false).
    return req<SubmitResult>(`/quests/${questId}/submit`, { method: "POST", token, body });
  },
  /** Free-form logging: photo + free-text description -> 0G-verified sighting. */
  submitLog(
    token: string,
    body: {
      imageDataUrl: string;
      description: string;
      species?: string;
      lat?: number;
      lng?: number;
      radiusM?: number;
    },
  ) {
    return req<SubmitResult>("/log", { method: "POST", token, body });
  },
  getMe(token: string) {
    return req<ApiProfile>("/me", { token });
  },
  getGallery(token: string) {
    return req<GalleryItem[]>("/me/gallery", { token }).then((items) =>
      items.map((it) => ({ ...it, photo: assetUrl(it.photo) })),
    );
  },
  getActivity(token: string) {
    return req<ActivityEvent[]>("/me/activity", { token });
  },
  /** Plausibility agent verdict for a sighting (species-range/season check via the subgraph). */
  getPlausibility(token: string, sightingId: string) {
    return req<PlausibilityVerdict>(`/me/sightings/${sightingId}/plausibility`, { token });
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
