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
  PlausibilityVerdict,
  Quest,
  QuestStatus,
  SubmitResult,
  Verification,
  VerifyStep,
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

/** RP context the backend signs; handed to the IDKit widget (mirrors idkit-core RpContext). */
export type RpContext = {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
};

/** Everything the IDKit widget needs for a request, fetched from the backend. */
export type WorldContext = {
  app_id: string;
  action: string;
  rp_context: RpContext;
  environment: "production" | "staging" | "sandbox";
  allow_legacy_proofs: boolean;
  /** true when the backend is in dev-mock mode (no real World ID app configured). */
  simulated: boolean;
};

/** The IDKit proof result, forwarded verbatim to the backend v4 verifier. */
export type IdkitResponse = Record<string, unknown>;

/** What the frontend POSTs after IDKit returns a proof. */
export type WorldProofSubmission = { rp_id: string; idkitResponse: IdkitResponse };

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
 * Dev proof for local login without a real World ID app. The backend accepts it
 * in dev-mock mode (app_id/rp_id/signing key unset). Used only when the fetched
 * WorldContext says `simulated: true`; a real app opens the IDKit widget instead.
 */
export function devIdkitResponse(
  credential: "selfie" | "passport" | "proof_of_human" = "selfie",
): WorldProofSubmission {
  const rand = Math.random().toString(16).slice(2, 10);
  return {
    rp_id: "rp_dev",
    idkitResponse: {
      protocol_version: credential === "selfie" ? "3.0" : "4.0",
      responses: [{ identifier: credential, nullifier: `0xdev_${credential}_${rand}` }],
      // Identity Check attests attributes; mirror that so the paid tier unlocks in dev.
      ...(credential === "passport" ? { identity_attested: true } : {}),
    },
  };
}

/** Dev placeholders for Google / SIWE; the backend accepts them in dev-mock mode. */
export function devIdToken(): string {
  return `dev.google.${Math.random().toString(16).slice(2, 10)}`;
}
export function devSiwe(address: string, nonce: string): { message: string; signature: string } {
  const r = Math.random().toString(16).slice(2, 10);
  return {
    message: `Nautica dev SIWE\naddress: ${address}\nnonce: ${nonce}`,
    signature: `0xdevsig${r}`,
  };
}

export const api = {
  /** Step 1: fetch a backend-signed RP context for the requested credential. */
  getWorldContext(credential: VerifyStep = "face") {
    return req<WorldContext>(`/auth/worldid/context?credential=${credential}`, {});
  },
  /** Step 2 (login): submit the IDKit proof — Selfie Check one-human sign-in. */
  loginWorldId(submission: WorldProofSubmission) {
    return req<LoginResponse>("/auth/worldid", { method: "POST", body: submission });
  },
  /** Step 2 (upgrade): submit the IDKit proof to raise a tier. */
  verifyTier(token: string, submission: WorldProofSubmission, credential: VerifyStep = "passport") {
    return req<{ tiers: string[]; profile: ApiProfile; simulated: boolean }>("/auth/verify", {
      method: "POST",
      token,
      body: { ...submission, credential },
    });
  },
  loginGoogle(idToken: string) {
    return req<LoginResponse>("/auth/google", { method: "POST", body: { idToken } });
  },
  walletNonce(address: string) {
    return req<{ nonce: string }>(`/auth/nonce?address=${address}`, {});
  },
  loginWallet(message: string, signature: string) {
    return req<LoginResponse>("/auth/wallet", { method: "POST", body: { message, signature } });
  },
  attachWallet(token: string, message: string, signature: string) {
    return req<{ profile: ApiProfile }>("/me/wallet", {
      method: "POST",
      token,
      body: { message, signature },
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
