"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  apiEnabled,
  devIdToken,
  devProof,
  devSiwe,
  sessionToken,
  type ApiProfile,
  type WorldProof,
} from "@/lib/api/client";
import { DAILY_QUESTS } from "./content";
import { levelInfo as computeLevel, PAID_UNLOCK_LEVEL } from "./levels";
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
  GalleryItem,
  LeaderboardEntry,
  LevelInfo,
  PanelId,
  Payment,
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
const DEV_ADDRESS = "0x8Ac0000000000000000000000000000000004F21";

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

const STEP_LEVEL: Record<VerifyStep, WorldProof["verification_level"]> = {
  face: "device",
  passport: "document",
  orb: "orb",
};

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

  setOpenPanel: (p: PanelId | null) => void;
  openQuest: (questId: string) => void;
  connectWorldId: () => void;
  connectGoogle: () => void;
  connectWallet: () => void;
  attachWallet: () => void;
  verify: (step: VerifyStep) => void;
  submitQuest: (questId: string, photo?: File | null) => Promise<SubmitResult>;
  withdraw: () => void;
  grantXp: (n: number) => void;
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
        // TODO: replace devProof() with a real @worldcoin/idkit proof.
        const { token: tok } = await api.loginWorldId(devProof("device"));
        sessionToken.set(tok);
        setToken(tok);
        await hydrate(tok);
      } catch (e) {
        setError(e instanceof Error ? e.message : "sign-in failed");
      } finally {
        setConnecting(false);
      }
    })();
  }, [hydrate]);

  // Google / Wallet sign-in. In mock mode they seed the same returning player as
  // World ID so the hub is populated. Real integrations need backend routes that
  // don't exist yet (server owns /auth/*) — hence the honest API-mode message.
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
        // Stage 2: replace DEV_ADDRESS + devSiwe() with a real wagmi connect + SIWE signature.
        const { nonce } = await api.walletNonce(DEV_ADDRESS);
        const { message, signature } = devSiwe(DEV_ADDRESS, nonce);
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
        const { nonce } = await api.walletNonce(DEV_ADDRESS);
        const { message, signature } = devSiwe(DEV_ADDRESS, nonce);
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
        setUser((u) => ({ ...u, verification: { ...u.verification, [step]: true } }));
        setHistory((h) => [
          { id: uid("h"), kind: "verify", title: `Verified with ${step[0]?.toUpperCase()}${step.slice(1)}`, at: Date.now() },
          ...h,
        ]);
        return;
      }
      if (!token) return;
      (async () => {
        try {
          await api.verifyTier(token, devProof(STEP_LEVEL[step]));
          await hydrate(token);
        } catch (e) {
          setError(e instanceof Error ? e.message : "verification failed");
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
    async (questId, photo) => {
      const quest = quests.find((q) => q.id === questId);
      if (!quest) return { ok: false, reason: "Quest not found." };

      // ---- API mode: challenge -> submit -> re-hydrate ----
      if (apiEnabled) {
        if (!token) return { ok: false, reason: "Not signed in." };
        setQuests((qs) => qs.map((q) => (q.id === questId ? { ...q, status: "verifying" } : q)));
        try {
          const { nonce } = await api.challenge(token, questId);
          const imageDataUrl = photo ? await fileToDataUrl(photo) : "";
          const result = await api.submit(token, questId, { nonce, imageDataUrl });
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
        lat: LISBON[1] + jitter(),
        lng: LISBON[0] + jitter(),
        at: Date.now(),
      };
      const before = computeLevel(user.xp).level;
      const after = computeLevel(user.xp + quest.reward).level;

      setGallery((g) => [item, ...g]);
      setQuests((qs) => qs.map((q) => (q.id === questId ? { ...q, status: "done" } : q)));
      setHistory((h) => [
        { id: uid("h"), kind: "quest", title: quest.title, species: quest.species, xp: quest.reward, usdc: quest.usdc, attestation, at: Date.now() },
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
    setOpenPanel,
    openQuest,
    connectWorldId,
    connectGoogle,
    connectWallet,
    attachWallet,
    verify,
    submitQuest,
    withdraw,
    grantXp,
    dismissLevelUp: () => setLastLevelUp(null),
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider>");
  return ctx;
}
