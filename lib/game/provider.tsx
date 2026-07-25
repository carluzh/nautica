"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  api,
  apiEnabled,
  devIdToken,
  devIdkitResponse,
  sessionToken,
  type ApiProfile,
  type CreateQuestBody,
  type WorldContext,
} from "@/lib/api/client";
import { humanizeWorldIdError } from "@/lib/worldid-errors";
import { connectInjectedWallet, signSiweWithWallet } from "../wallet";

// Real World ID widget — browser-only (IDKit pulls WASM). ssr:false keeps it out
// of the server render. In dev-mock mode it never mounts (we submit a dev proof).
const WorldIdWidget = dynamic(
  () => import("@/components/app/worldid-widget").then((m) => m.WorldIdWidget),
  { ssr: false },
);
import { DAILY_QUESTS } from "./content";
import { levelInfo as computeLevel, PAID_UNLOCK_LEVEL, xpForLevel } from "./levels";
import {
  INITIAL_USER,
  LEADERBOARD,
  RETURNING_USER,
  SEED_GALLERY,
  SEED_HISTORY,
} from "./mock";
import type {
  ActivityEvent,
  Attestation,
  FocusTarget,
  GalleryItem,
  LeaderboardEntry,
  LevelInfo,
  PanelId,
  Payment,
  PickedPlace,
  PlausibilityVerdict,
  Quest,
  SubmitResult,
  UserState,
  VerifyStep,
} from "./types";

export type { SubmitResult } from "./types";

// ---------------------------------------------------------------------------
// Two data sources behind ONE identical useGame() contract:
//  - mock mode (default): self-contained, no backend needed — for frontend work.
//  - API mode (NEXT_PUBLIC_API_URL set): talks to the server via lib/api/client.
// Panels never know or care which is active.
// ---------------------------------------------------------------------------

const LISBON: [number, number] = [-9.15, 38.7];
const MOCK_WALLET = "0x8Ac…4F21";

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
function fakeHash(): string {
  let h = "0x";
  for (let i = 0; i < 12; i++) h += Math.floor(Math.random() * 16).toString(16);
  return h + "…";
}

/** Simulated 0G classification (mock mode only). */
async function classify(label: string): Promise<Attestation> {
  await new Promise((r) => setTimeout(r, 950));
  return {
    model: "qwen3-vl-30b",
    verdict: "pass",
    confidence: 0.9 + Math.random() * 0.09,
    label,
    tee: "Intel TDX · TeeTLS",
    hash: fakeHash(),
    at: Date.now(),
    simulated: false,
    teeVerified: true,
    attestationSource: "0g-router:verify_tee",
    provider: "0x4415ef5CBb415347bb18493af7cE01f225Fc0868",
    verifiability: "TeeTLS",
    teeSigner: "0x03716ddFbA77600C33b605FABD2F70Fe89856b0d",
    providerVerifiability: "TeeML",
    providerAcknowledged: true,
    quoteVerified: true,
    quoteVerifier: "automata-onchain",
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function userFromProfile(p: ApiProfile): UserState {
  return {
    connected: true,
    handle: p.handle,
    wallet: p.wallet,
    xp: p.xp,
    streak: p.streak,
    verification: p.verification,
    balanceUsd: p.balanceUsd,
  };
}

/** Dev-mock credential per tier (the real widget picks its own preset). */
const STEP_CREDENTIAL: Record<VerifyStep, "selfie" | "passport" | "proof_of_human"> = {
  face: "selfie",
  passport: "passport",
  orb: "proof_of_human",
};

const VERIFY_LABEL: Record<VerifyStep, string> = {
  face: "Selfie Check",
  passport: "Identity Check",
  orb: "Orb",
};

/** Result of a partner quest post: the created quest on success (with its escrow
 *  tx), or a reason string to surface to the partner. */
export type CreateQuestResult =
  | { ok: true; quest: Quest; txHash?: string; simulated: boolean }
  | { ok: false; reason: string };

type GameValue = {
  user: UserState;
  level: LevelInfo;
  quests: Quest[];
  gallery: GalleryItem[];
  history: ActivityEvent[];
  payments: Payment[];
  leaderboard: LeaderboardEntry[];
  paidUnlocked: boolean;
  connecting: boolean;
  error: string | null;
  openPanel: PanelId | null;
  activeQuestId: string | null;
  lastLevelUp: number | null;
  /** Plausibility verdicts keyed by sighting id, filled lazily by loadPlausibility. */
  plausibility: Record<string, PlausibilityVerdict>;
  /** Sighting ids whose verdict is still being fetched/awaited (indexing lag). */
  plausibilityPending: Record<string, boolean>;
  /** A sighting the feed asked the map to fly to + open its popup (null = none pending). */
  focusTarget: FocusTarget | null;

  setOpenPanel: (p: PanelId | null) => void;
  focusSighting: (t: FocusTarget) => void;
  clearFocus: () => void;
  /** Ask the plausibility agent about a sighting (no-op until API mode + signed in). */
  loadPlausibility: (sightingId: string) => void;
  openQuest: (questId: string) => void;
  connectWorldId: () => void;
  connectGoogle: () => void;
  connectWallet: () => void;
  attachWallet: () => void;
  verify: (step: VerifyStep) => void;
  submitQuest: (questId: string, photo?: File | null, place?: PickedPlace) => Promise<SubmitResult>;
  /** Partner: post + fund a quest. Re-hydrates the board on success (API mode). */
  createQuest: (body: CreateQuestBody) => Promise<CreateQuestResult>;
  withdraw: () => void;
  /** Local-only rename of the profile name (no backend persistence yet). */
  setHandle: (name: string) => void;
  grantXp: (n: number) => void;
  /** Demo shortcut: floor the user to Level 5 (persisted in API mode). */
  demoLevel: () => void;
  signOut: () => void;
  dismissLevelUp: () => void;
};

const GameContext = createContext<GameValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserState>(INITIAL_USER);
  const [quests, setQuests] = useState<Quest[]>(DAILY_QUESTS);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [history, setHistory] = useState<ActivityEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(apiEnabled ? [] : LEADERBOARD);
  const [token, setToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null);
  const [lastLevelUp, setLastLevelUp] = useState<number | null>(null);
  const [plausibility, setPlausibility] = useState<Record<string, PlausibilityVerdict>>({});
  const [plausibilityPending, setPlausibilityPending] = useState<Record<string, boolean>>({});
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  // Sightings already requested, so a re-rendered card never refetches.
  const plausibilityRequested = useRef<Set<string>>(new Set());
  // Real World ID widget flow. `mode` = login vs tier upgrade; `credential` picks
  // the preset/action. Only mounts when a real World ID app is configured.
  const [worldId, setWorldId] = useState<{
    open: boolean;
    mode: "login" | "upgrade";
    credential: VerifyStep;
    ctx: WorldContext | null;
  }>({ open: false, mode: "login", credential: "face", ctx: null });

  const level = useMemo(() => computeLevel(user.xp), [user.xp]);
  const paidUnlocked = level.level >= PAID_UNLOCK_LEVEL;

  // API mode: pull the full player state from the server.
  const hydrate = useCallback(async (tok: string) => {
    const [profile, questsRes, g, activity, pay, board] = await Promise.all([
      api.getMe(tok),
      api.getQuests(tok),
      api.getGallery(tok),
      api.getActivity(tok),
      api.getPayments(tok),
      api.getLeaderboard(tok),
    ]);
    setUser(userFromProfile(profile));
    setQuests(questsRes.quests);
    setGallery(g);
    setHistory(activity);
    setPayments(pay);
    setLeaderboard(board);
  }, []);

  // API mode: resume an existing session on load.
  useEffect(() => {
    if (!apiEnabled) return;
    const tok = sessionToken.get();
    if (!tok) return;
    setToken(tok);
    hydrate(tok).catch(() => sessionToken.clear());
  }, [hydrate]);

  // Finish a World ID flow once IDKit returns a proof: forward it to the server
  // verifier, then hydrate. Login mints a session; upgrade raises a tier.
  const finishWorldId = useCallback(
    async (mode: "login" | "upgrade", credential: VerifyStep, ctx: WorldContext, result: unknown) => {
      const submission = { rp_id: ctx.rp_context.rp_id, idkitResponse: result as Record<string, unknown> };
      if (mode === "upgrade") {
        if (!token) return;
        await api.verifyTier(token, submission, credential);
        await hydrate(token);
        toast.success(`${VERIFY_LABEL[credential]} verified`);
      } else {
        const { token: tok } = await api.loginWorldId(submission);
        sessionToken.set(tok);
        setToken(tok);
        await hydrate(tok);
      }
    },
    [token, hydrate],
  );

  const onWorldIdResult = useCallback(
    (result: unknown) => {
      const { mode, credential, ctx } = worldId;
      if (!ctx) return;
      (async () => {
        try {
          await finishWorldId(mode, credential, ctx, result);
        } catch (e) {
          const msg = humanizeWorldIdError(e instanceof Error ? e.message : "verification failed");
          setError(msg);
          toast.error(msg);
        } finally {
          setConnecting(false);
          setWorldId((w) => ({ ...w, open: false }));
        }
      })();
    },
    [worldId, finishWorldId],
  );

  const connectWorldId = useCallback(() => {
    if (!apiEnabled) {
      // mock: seed a returning player so the hub is populated.
      setUser((u) => ({ ...u, ...RETURNING_USER } as UserState));
      setGallery(SEED_GALLERY);
      setHistory(SEED_HISTORY);
      return;
    }
    setConnecting(true);
    setError(null);
    (async () => {
      try {
        const ctx = await api.getWorldContext("face");
        if (ctx.simulated) {
          const { token: tok } = await api.loginWorldId(devIdkitResponse("selfie"));
          sessionToken.set(tok);
          setToken(tok);
          await hydrate(tok);
          setConnecting(false);
        } else {
          setWorldId({ open: true, mode: "login", credential: "face", ctx });
        }
      } catch (e) {
        setError(humanizeWorldIdError(e instanceof Error ? e.message : "sign-in failed"));
        setConnecting(false);
      }
    })();
  }, [hydrate]);

  // Google / Wallet sign-in. Mock mode seeds the returning player; API mode calls the server.
  const connectGoogle = useCallback(() => {
    if (!apiEnabled) {
      // Google sign-in: unverified, no payout wallet yet (set later in Settings).
      setUser((u) => ({ ...u, ...RETURNING_USER, verification: { face: false, passport: false, orb: false }, wallet: null } as UserState));
      setGallery(SEED_GALLERY);
      setHistory(SEED_HISTORY);
      return;
    }
    setConnecting(true);
    setError(null);
    (async () => {
      try {
        // Stage 2: swap devIdToken() for a real Google Identity Services ID token.
        const { token: tok } = await api.loginGoogle(devIdToken());
        sessionToken.set(tok);
        setToken(tok);
        await hydrate(tok);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Google sign-in failed");
      } finally {
        setConnecting(false);
      }
    })();
  }, [hydrate]);

  const connectWallet = useCallback(() => {
    if (!apiEnabled) {
      // Wallet sign-in: the wallet IS the identity — attached at login, still unverified.
      setUser((u) => ({ ...u, ...RETURNING_USER, verification: { face: false, passport: false, orb: false }, wallet: MOCK_WALLET } as UserState));
      setGallery(SEED_GALLERY);
      setHistory(SEED_HISTORY);
      return;
    }
    setConnecting(true);
    setError(null);
    (async () => {
      try {
        // Real injected wallet (MetaMask/Base): connect -> nonce -> SIWE sign.
        const address = await connectInjectedWallet();
        const { nonce } = await api.walletNonce(address);
        const { message, signature } = await signSiweWithWallet(address, nonce);
        const { token: tok } = await api.loginWallet(message, signature);
        sessionToken.set(tok);
        setToken(tok);
        await hydrate(tok);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Wallet sign-in failed");
      } finally {
        setConnecting(false);
      }
    })();
  }, [hydrate]);

  // Attach a payout wallet to a logged-in World ID / Google user (SIWE).
  const attachWallet = useCallback(() => {
    if (!apiEnabled) {
      setUser((u) => ({ ...u, wallet: MOCK_WALLET }));
      setHistory((h) => [
        { id: uid("h"), kind: "verify", title: "Payout wallet connected", at: Date.now() },
        ...h,
      ]);
      return;
    }
    if (!token) return;
    (async () => {
      try {
        const address = await connectInjectedWallet();
        const { nonce } = await api.walletNonce(address);
        const { message, signature } = await signSiweWithWallet(address, nonce);
        const { profile } = await api.attachWallet(token, message, signature);
        setUser(userFromProfile(profile));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not attach wallet");
      }
    })();
  }, [token]);

  const verify = useCallback(
    (step: VerifyStep) => {
      if (!apiEnabled) {
        // Mirror the server: a tier floors xp (face→75, passport→135, orb→210).
        const floor = step === "orb" ? 210 : step === "passport" ? 135 : 75;
        setUser((u) => {
          const xp = Math.max(u.xp, floor);
          if (computeLevel(xp).level > computeLevel(u.xp).level) setLastLevelUp(computeLevel(xp).level);
          return { ...u, verification: { ...u.verification, [step]: true }, xp };
        });
        setHistory((h) => [
          { id: uid("h"), kind: "verify", title: `Verified with ${VERIFY_LABEL[step]}`, at: Date.now() },
          ...h,
        ]);
        toast.success(`${VERIFY_LABEL[step]} verified`);
        return;
      }
      if (!token) return;
      (async () => {
        try {
          const ctx = await api.getWorldContext(step);
          if (ctx.simulated) {
            await api.verifyTier(token, devIdkitResponse(STEP_CREDENTIAL[step]), step);
            await hydrate(token);
            toast.success(`${VERIFY_LABEL[step]} verified`);
          } else {
            setConnecting(true);
            setWorldId({ open: true, mode: "upgrade", credential: step, ctx });
          }
        } catch (e) {
          const msg = humanizeWorldIdError(e instanceof Error ? e.message : "verification failed");
          setError(msg);
          toast.error(msg);
        }
      })();
    },
    [token, hydrate],
  );

  const openQuest = useCallback((questId: string) => {
    setActiveQuestId(questId);
    setOpenPanel("quest");
  }, []);

  const submitQuest = useCallback<GameValue["submitQuest"]>(
    async (questId, photo, place) => {
      const quest = quests.find((q) => q.id === questId);
      if (!quest) return { ok: false, reason: "Quest not found." };

      // ---- API mode: challenge -> submit -> re-hydrate ----
      if (apiEnabled) {
        if (!token) return { ok: false, reason: "Not signed in." };
        setQuests((qs) => qs.map((q) => (q.id === questId ? { ...q, status: "verifying" } : q)));
        try {
          const { nonce } = await api.challenge(token, questId);
          const imageDataUrl = photo ? await fileToDataUrl(photo) : "";
          const result = await api.submit(token, questId, {
            nonce,
            imageDataUrl,
            ...(place
              ? {
                  lat: place.lat,
                  lng: place.lng,
                  radiusM: place.radiusM,
                  anchorLat: place.anchorLat,
                  anchorLng: place.anchorLng,
                }
              : {}),
          });
          if (result.ok) {
            await hydrate(token);
            if (result.leveledTo) setLastLevelUp(result.leveledTo);
          } else {
            setQuests((qs) => qs.map((q) => (q.id === questId ? { ...q, status: "available" } : q)));
          }
          return result;
        } catch (e) {
          setQuests((qs) => qs.map((q) => (q.id === questId ? { ...q, status: "available" } : q)));
          return { ok: false, reason: e instanceof Error ? e.message : "submission failed" };
        }
      }

      // ---- mock mode: simulate the whole flow locally ----
      const currentLevel = computeLevel(user.xp).level;
      if (quest.kind === "paid") {
        if (currentLevel < PAID_UNLOCK_LEVEL)
          return { ok: false, reason: `Reach Level ${PAID_UNLOCK_LEVEL} to unlock paid quests.` };
        if (!user.verification.passport)
          return { ok: false, reason: "Verify with World ID (Passport)." };
        if (!user.wallet)
          return { ok: false, reason: "Attach a wallet in Settings to get paid." };
      }

      setQuests((qs) => qs.map((q) => (q.id === questId ? { ...q, status: "verifying" } : q)));
      const attestation = await classify(`${quest.species} · matches "${quest.spec}"`);
      const photoUrl = photo ? URL.createObjectURL(photo) : undefined;
      const jitter = () => (Math.random() - 0.5) * 0.4;
      const item: GalleryItem = {
        id: uid("g"),
        questId,
        species: quest.species,
        title: quest.title,
        photo: photoUrl,
        attestation,
        xp: quest.reward,
        usdc: quest.usdc,
        lat: place ? place.lat : LISBON[1] + jitter(),
        lng: place ? place.lng : LISBON[0] + jitter(),
        radiusM: place?.radiusM,
        at: Date.now(),
      };
      const before = computeLevel(user.xp).level;
      const after = computeLevel(user.xp + quest.reward).level;

      setGallery((g) => [item, ...g]);
      setQuests((qs) => qs.map((q) => (q.id === questId ? { ...q, status: "done" } : q)));
      setHistory((h) => [
        { id: uid("h"), kind: "quest", title: quest.title, species: quest.species, xp: quest.reward, usdc: quest.usdc, attestation, lng: item.lng, lat: item.lat, at: Date.now() },
        ...h,
      ]);
      setUser((u) => ({ ...u, xp: u.xp + quest.reward, balanceUsd: u.balanceUsd + (quest.usdc ?? 0) }));
      if (quest.kind === "paid" && quest.usdc) {
        setPayments((p) => [
          { id: uid("pay"), partner: quest.partner ?? "Research partner", quest: quest.title, usdc: quest.usdc!, status: "settled", txHash: fakeHash(), at: Date.now() },
          ...p,
        ]);
      }
      if (after > before) {
        setLastLevelUp(after);
        setHistory((h) => [{ id: uid("h"), kind: "levelup", title: `Reached Level ${after}`, at: Date.now() }, ...h]);
      }
      return { ok: true, attestation, leveledTo: after > before ? after : undefined, usdc: quest.usdc };
    },
    [quests, user.xp, user.verification.passport, user.wallet, token, hydrate],
  );

  // Partner: post + fund a quest. API mode escrows on-chain via the server then
  // re-hydrates so the new quest joins the board; mock mode adds it locally.
  const createQuest = useCallback<GameValue["createQuest"]>(
    async (body) => {
      if (apiEnabled) {
        if (!token) return { ok: false, reason: "Not signed in." };
        try {
          const res = await api.createQuest(token, body);
          await hydrate(token);
          return { ok: true, quest: res.quest, txHash: res.txHash, simulated: res.simulated };
        } catch (e) {
          return { ok: false, reason: e instanceof Error ? e.message : "Could not post quest" };
        }
      }
      // mock: no backend — synthesize the quest and prepend it to the board.
      const q: Quest = {
        id: uid("q"),
        kind: body.usdc > 0 ? "paid" : "free",
        title: body.title,
        spec: body.spec,
        species: body.species,
        reward: body.reward,
        status: "available",
        ...(body.usdc > 0
          ? { usdc: body.usdc, partner: body.partner, requirements: body.requirements }
          : {}),
        onchain: true,
        remainingUsd: body.funding,
      };
      setQuests((qs) => [q, ...qs]);
      return { ok: true, quest: q, simulated: true };
    },
    [token, hydrate],
  );

  const withdraw = useCallback(() => {
    // Optimistic in both modes; API mode does not yet persist a withdrawal.
    setPayments((p) => p.map((x) => ({ ...x, status: "settled" as const })));
    setUser((u) => ({ ...u, balanceUsd: 0 }));
  }, []);

  const grantXp = useCallback((n: number) => {
    // Demo helper (client-side). Not persisted to the server in API mode.
    setUser((u) => {
      const after = computeLevel(u.xp + n).level;
      const before = computeLevel(u.xp).level;
      if (after > before) setLastLevelUp(after);
      return { ...u, xp: u.xp + n };
    });
  }, []);

  // Demo shortcut: floor the user to Level 5. Persisted server-side in API mode.
  const demoLevel = useCallback(() => {
    if (!apiEnabled) {
      const target = xpForLevel(PAID_UNLOCK_LEVEL);
      setUser((u) => {
        const xp = Math.max(u.xp, target);
        if (computeLevel(xp).level > computeLevel(u.xp).level) setLastLevelUp(computeLevel(xp).level);
        return { ...u, xp };
      });
      return;
    }
    if (!token) return;
    (async () => {
      try {
        await api.demoLevel(token);
        await hydrate(token); // refresh xp + the level-up activity entry
        setLastLevelUp(PAID_UNLOCK_LEVEL);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not skip level");
      }
    })();
  }, [token, hydrate]);

  // Fetch the plausibility verdict for one sighting (API mode only). Cards call this
  // on open; the ref guard makes it fire once per sighting per session. A just-recorded
  // sighting isn't indexed yet, so a miss retries on a fixed interval (bounded) until
  // the server's eager job has the verdict — no manual reopen needed.
  const loadPlausibility = useCallback(
    (sightingId: string) => {
      if (!apiEnabled || !token) return;
      if (plausibilityRequested.current.has(sightingId)) return;
      plausibilityRequested.current.add(sightingId);
      setPlausibilityPending((m) => ({ ...m, [sightingId]: true }));
      let attempts = 0;
      const attempt = () => {
        api
          .getPlausibility(token, sightingId)
          .then((v) => {
            setPlausibility((m) => ({ ...m, [sightingId]: v }));
            setPlausibilityPending((m) => ({ ...m, [sightingId]: false }));
          })
          .catch(() => {
            attempts += 1;
            if (attempts < 10) {
              setTimeout(attempt, 5000); // not indexed/assessed yet — keep waiting
            } else {
              plausibilityRequested.current.delete(sightingId); // allow a later re-request
              setPlausibilityPending((m) => ({ ...m, [sightingId]: false }));
            }
          });
      };
      attempt();
    },
    [token],
  );

  // End the session and reset to the logged-out state. Drops the server token so
  // the next sign-in mints a fresh session — needed to re-test the World ID flow.
  const signOut = useCallback(() => {
    sessionToken.clear();
    setToken(null);
    setUser(INITIAL_USER);
    setGallery([]);
    setHistory([]);
    setPayments([]);
    setPlausibility({});
    setPlausibilityPending({});
    plausibilityRequested.current.clear();
    setLeaderboard(apiEnabled ? [] : LEADERBOARD);
    setQuests(DAILY_QUESTS);
    setError(null);
    setConnecting(false);
    setOpenPanel(null);
    setActiveQuestId(null);
    setLastLevelUp(null);
    setFocusTarget(null);
    setWorldId({ open: false, mode: "login", credential: "face", ctx: null });
  }, []);

  const value: GameValue = {
    user,
    level,
    quests,
    gallery,
    history,
    payments,
    leaderboard,
    paidUnlocked,
    connecting,
    error,
    openPanel,
    activeQuestId,
    lastLevelUp,
    plausibility,
    plausibilityPending,
    focusTarget,
    setOpenPanel,
    focusSighting: setFocusTarget,
    clearFocus: () => setFocusTarget(null),
    loadPlausibility,
    openQuest,
    connectWorldId,
    connectGoogle,
    connectWallet,
    attachWallet,
    verify,
    submitQuest,
    createQuest,
    withdraw,
    // mock: real persistence needs a backend endpoint that ties the profile name/photo to the World ID identity and the connected wallet (not built yet).
    setHandle: (name) => setUser((u) => ({ ...u, handle: name })),
    grantXp,
    demoLevel,
    signOut,
    dismissLevelUp: () => setLastLevelUp(null),
  };

  return (
    <GameContext.Provider value={value}>
      {children}
      {worldId.ctx && !worldId.ctx.simulated && (
        <WorldIdWidget
          ctx={worldId.ctx}
          credential={worldId.credential}
          open={worldId.open}
          onOpenChange={(open) => {
            setWorldId((w) => ({ ...w, open }));
            if (!open) setConnecting(false); // user closed the modal
          }}
          onResult={onWorldIdResult}
          onError={(code) => {
            const msg = humanizeWorldIdError(code);
            setError(msg);
            toast.error(msg);
            setConnecting(false);
            setWorldId((w) => ({ ...w, open: false }));
          }}
        />
      )}
    </GameContext.Provider>
  );
}

export function useGame(): GameValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider>");
  return ctx;
}
