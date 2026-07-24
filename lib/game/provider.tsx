"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
  LevelInfo,
  PanelId,
  Payment,
  Quest,
  UserState,
  VerifyStep,
} from "./types";

const LISBON: [number, number] = [-9.15, 38.7];

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function fakeHash(): string {
  let h = "0x";
  for (let i = 0; i < 12; i++) h += Math.floor(Math.random() * 16).toString(16);
  return h + "…";
}

/** Simulated 0G TEE classification. Real integration swaps this for a call to
 *  the 0G Compute router with qwen3-vl-30b and a real attestation. */
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

export type SubmitResult =
  | { ok: true; attestation: Attestation; leveledTo?: number; usdc?: number }
  | { ok: false; reason: string };

type GameValue = {
  user: UserState;
  level: LevelInfo;
  quests: Quest[];
  gallery: GalleryItem[];
  history: ActivityEvent[];
  payments: Payment[];
  leaderboard: typeof LEADERBOARD;
  paidUnlocked: boolean;
  openPanel: PanelId | null;
  activeQuestId: string | null;
  lastLevelUp: number | null;

  setOpenPanel: (p: PanelId | null) => void;
  openQuest: (questId: string) => void;
  connectWorldId: () => void;
  verify: (step: VerifyStep) => void;
  submitQuest: (questId: string, photo?: File | null) => Promise<SubmitResult>;
  withdraw: () => void;
  grantXp: (n: number) => void; // demo helper (honest time-skip)
  dismissLevelUp: () => void;
};

const GameContext = createContext<GameValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserState>(INITIAL_USER);
  const [quests, setQuests] = useState<Quest[]>(DAILY_QUESTS);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [history, setHistory] = useState<ActivityEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null);
  const [lastLevelUp, setLastLevelUp] = useState<number | null>(null);

  const level = useMemo(() => computeLevel(user.xp), [user.xp]);
  const paidUnlocked = level.level >= PAID_UNLOCK_LEVEL;

  const connectWorldId = useCallback(() => {
    setUser((u) => ({ ...u, ...RETURNING_USER } as UserState));
    setGallery(SEED_GALLERY);
    setHistory(SEED_HISTORY);
  }, []);

  const verify = useCallback((step: VerifyStep) => {
    setUser((u) => ({ ...u, verification: { ...u.verification, [step]: true } }));
    setHistory((h) => [
      { id: uid("h"), kind: "verify", title: `Verified with ${step[0].toUpperCase() + step.slice(1)}`, at: Date.now() },
      ...h,
    ]);
  }, []);

  const openQuest = useCallback((questId: string) => {
    setActiveQuestId(questId);
    setOpenPanel("quest");
  }, []);

  const submitQuest = useCallback<GameValue["submitQuest"]>(
    async (questId, photo) => {
      const quest = quests.find((q) => q.id === questId);
      if (!quest) return { ok: false, reason: "Quest not found." };

      const currentLevel = computeLevel(user.xp).level;
      if (quest.kind === "paid") {
        if (currentLevel < PAID_UNLOCK_LEVEL)
          return { ok: false, reason: `Reach Level ${PAID_UNLOCK_LEVEL} to unlock paid quests.` };
        if (!user.verification.passport)
          return { ok: false, reason: "Passport (Identity Check) verification required for paid quests." };
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
    [quests, user.xp, user.verification.passport],
  );

  const withdraw = useCallback(() => {
    setPayments((p) => p.map((x) => ({ ...x, status: "settled" as const })));
    setUser((u) => ({ ...u, balanceUsd: 0 }));
  }, []);

  const grantXp = useCallback((n: number) => {
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
    leaderboard: LEADERBOARD,
    paidUnlocked,
    openPanel,
    activeQuestId,
    lastLevelUp,
    setOpenPanel,
    openQuest,
    connectWorldId,
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
