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
import {
  api,
  apiEnabled,
  sessionToken,
  type ApiProfile,
} from "@/lib/api/client";
import { useT } from "@/lib/i18n";
import { DAILY_QUESTS } from "./content";
import { levelInfo as computeLevel } from "./levels";
import { INITIAL_USER, LEADERBOARD } from "./mock";
import { REAL_SIGHTINGS } from "@/sightings";
import type {
  ActivityEvent,
  Attestation,
  FocusTarget,
  GalleryItem,
  LeaderboardEntry,
  LevelInfo,
  LogSubmission,
  PanelId,
  PickedPlace,
  PlausibilityVerdict,
  Quest,
  Sighting,
  SubmitResult,
  UserState,
} from "./types";

export type { SubmitResult } from "./types";

// One useGame() contract over two data sources: mock mode (default, no backend)
// and API mode (NEXT_PUBLIC_API_URL set, talks to the server). Callers can't tell.

const LISBON: [number, number] = [-9.15, 38.7];
/** Fixed XP awarded for a verified free-form log (mirrors the server LOG_XP). */
const LOG_XP = 15;

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

function userFromProfile(p: ApiProfile): UserState {
  return {
    connected: true,
    handle: p.handle,
    wallet: p.wallet,
    xp: p.xp,
    streak: p.streak,
  };
}

type GameValue = {
  user: UserState;
  level: LevelInfo;
  quests: Quest[];
  gallery: GalleryItem[];
  history: ActivityEvent[];
  /** Community sightings the map + stats read; new captures are appended here. */
  sightings: Sighting[];
  leaderboard: LeaderboardEntry[];
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
  /** Guest sign-in: mint a fresh account + session. */
  connectGuest: () => void;
  /** Email + password sign-in (register-or-login; one endpoint). */
  loginEmail: (email: string, password: string) => Promise<void>;
  submitQuest: (questId: string, photo?: File | null, place?: PickedPlace) => Promise<SubmitResult>;
  /** Free-form logging: photo + free-text description -> 0G-verified sighting. */
  addLog: (input: LogSubmission) => Promise<SubmitResult>;
  /** Local-only rename of the profile name (no backend persistence yet). */
  setHandle: (name: string) => void;
  grantXp: (n: number) => void;
  signOut: () => void;
  dismissLevelUp: () => void;
};

const GameContext = createContext<GameValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserState>(INITIAL_USER);
  const [quests, setQuests] = useState<Quest[]>(DAILY_QUESTS);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [history, setHistory] = useState<ActivityEvent[]>([]);
  // Community sightings store - the "same database" the map + stats read. Seeded
  // from the committed iNaturalist dataset; new captures are appended on submit.
  const [sightings, setSightings] = useState<Sighting[]>(REAL_SIGHTINGS);
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

  const level = useMemo(() => computeLevel(user.xp), [user.xp]);

  // Latest translator via a ref, so refreshCommunity (and hydrate, which the
  // session-resume effect depends on) keeps a stable identity across renders.
  const t = useT();
  const tRef = useRef(t);
  tRef.current = t;

  // API mode: pull the public community feed and merge it into the sightings
  // store (base iNaturalist seed + other players' captures). Our own captures are
  // excluded - they already render from the gallery's "mine" layer. Failures are
  // silent so the map keeps working when the feed is unreachable.
  const refreshCommunity = useCallback(async (myWallet: string | null) => {
    if (!apiEnabled) return;
    try {
      const items = await api.getCommunitySightings();
      const community: Sighting[] = items
        .filter((it) => !(it.wallet && myWallet && it.wallet === myWallet))
        .map((it) => ({
          id: it.id,
          species: it.species,
          lng: it.lng,
          lat: it.lat,
          label: it.label,
          at: it.at,
          photo: it.photo,
          attribution: `${it.handle} · ${tRef.current("Nautica player")}`,
        }));
      setSightings([...community, ...REAL_SIGHTINGS]);
    } catch {
      // Offline / endpoint unavailable - keep whatever the map already shows.
    }
  }, []);

  // API mode: pull the full player state from the server.
  const hydrate = useCallback(async (tok: string) => {
    const [profile, questsRes, g, activity, board] = await Promise.all([
      api.getMe(tok),
      api.getQuests(tok),
      api.getGallery(tok),
      api.getActivity(tok),
      api.getLeaderboard(tok),
    ]);
    setUser(userFromProfile(profile));
    setQuests(questsRes.quests);
    setGallery(g);
    setHistory(activity);
    setLeaderboard(board);
    // Non-blocking: the community layer refreshes alongside every hydrate
    // (sign-in, session resume, successful quest submit or log).
    void refreshCommunity(profile.wallet);
  }, [refreshCommunity]);

  // API mode: resume an existing session on load.
  useEffect(() => {
    if (!apiEnabled) return;
    const tok = sessionToken.get();
    if (!tok) return;
    setToken(tok);
    hydrate(tok).catch(() => sessionToken.clear());
  }, [hydrate]);

  // Guest sign-in. Mock mode flips the local user to connected; API mode mints a
  // fresh account + session on the server, then hydrates.
  const connectGuest = useCallback(() => {
    if (!apiEnabled) {
      setUser((u) => ({ ...u, connected: true, handle: "Guest" }));
      return;
    }
    setConnecting(true);
    setError(null);
    (async () => {
      try {
        const { token: tok } = await api.loginGuest();
        sessionToken.set(tok);
        setToken(tok);
        await hydrate(tok);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not continue as guest");
      } finally {
        setConnecting(false);
      }
    })();
  }, [hydrate]);

  // Email + password sign-in (register-or-login; the server find-or-creates).
  const loginEmail = useCallback(
    async (email: string, password: string) => {
      if (!apiEnabled) {
        setUser((u) => ({ ...u, connected: true, handle: email }));
        return;
      }
      setConnecting(true);
      setError(null);
      try {
        const { token: tok } = await api.loginEmail(email, password);
        sessionToken.set(tok);
        setToken(tok);
        await hydrate(tok);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sign-in failed";
        setError(msg);
        throw new Error(msg);
      } finally {
        setConnecting(false);
      }
    },
    [hydrate],
  );

  const openQuest = useCallback((questId: string) => {
    setActiveQuestId(questId);
    setOpenPanel("quest");
  }, []);

  const submitQuest = useCallback<GameValue["submitQuest"]>(
    async (questId, photo, place) => {
      const quest = quests.find((q) => q.id === questId);
      if (!quest) return { ok: false, reason: "Quest not found." };

      // API mode: challenge -> submit -> re-hydrate.
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

      // mock mode: simulate the whole flow locally (XP-only).
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
        lat: place ? place.lat : LISBON[1] + jitter(),
        lng: place ? place.lng : LISBON[0] + jitter(),
        radiusM: place?.radiusM,
        at: Date.now(),
      };
      const before = computeLevel(user.xp).level;
      const after = computeLevel(user.xp + quest.reward).level;

      setGallery((g) => [item, ...g]);
      // Post the capture into the shared community store so it lands in the same
      // database the map + stats read (deduped off the map's own-captures layer).
      setSightings((s) => [
        { id: item.id, species: item.species, lng: item.lng, lat: item.lat, label: item.title, at: item.at, photo: item.photo },
        ...s,
      ]);
      setQuests((qs) => qs.map((q) => (q.id === questId ? { ...q, status: "done" } : q)));
      setHistory((h) => [
        { id: uid("h"), kind: "quest", title: quest.title, species: quest.species, xp: quest.reward, attestation, lng: item.lng, lat: item.lat, at: Date.now() },
        ...h,
      ]);
      setUser((u) => ({ ...u, xp: u.xp + quest.reward }));
      if (after > before) {
        setLastLevelUp(after);
        setHistory((h) => [{ id: uid("h"), kind: "levelup", title: `Reached Level ${after}`, at: Date.now() }, ...h]);
      }
      return { ok: true, attestation, leveledTo: after > before ? after : undefined };
    },
    [quests, user.xp, token, hydrate],
  );

  // Free-form logging: a photo + free-text description, 0G-verified. API mode posts
  // to /log and re-hydrates; mock mode simulates classification + XP locally.
  const addLog = useCallback<GameValue["addLog"]>(
    async (input) => {
      const species = input.species ?? "Other";
      const place = input.place;

      if (apiEnabled) {
        if (!token) return { ok: false, reason: "Not signed in." };
        try {
          const result = await api.submitLog(token, {
            imageDataUrl: input.imageDataUrl,
            description: input.description,
            species,
            ...(place ? { lat: place.lat, lng: place.lng, radiusM: place.radiusM } : {}),
          });
          if (result.ok) {
            await hydrate(token);
            if (result.leveledTo) setLastLevelUp(result.leveledTo);
          }
          return result;
        } catch (e) {
          return { ok: false, reason: e instanceof Error ? e.message : "log failed" };
        }
      }

      // mock mode: simulate the whole flow locally.
      const attestation = await classify(`${species} · ${input.description}`);
      const jitter = () => (Math.random() - 0.5) * 0.4;
      const title = input.description.slice(0, 80);
      const item: GalleryItem = {
        id: uid("g"),
        questId: uid("log"),
        species,
        title,
        photo: input.imageDataUrl,
        attestation,
        xp: LOG_XP,
        lat: place ? place.lat : LISBON[1] + jitter(),
        lng: place ? place.lng : LISBON[0] + jitter(),
        radiusM: place?.radiusM,
        at: Date.now(),
      };
      const before = computeLevel(user.xp).level;
      const after = computeLevel(user.xp + LOG_XP).level;

      setGallery((g) => [item, ...g]);
      setSightings((s) => [
        { id: item.id, species: item.species, lng: item.lng, lat: item.lat, label: item.title, at: item.at, photo: item.photo },
        ...s,
      ]);
      setHistory((h) => [
        { id: uid("h"), kind: "quest", title, species, xp: LOG_XP, attestation, lng: item.lng, lat: item.lat, at: Date.now() },
        ...h,
      ]);
      setUser((u) => ({ ...u, xp: u.xp + LOG_XP }));
      if (after > before) {
        setLastLevelUp(after);
        setHistory((h) => [{ id: uid("h"), kind: "levelup", title: `Reached Level ${after}`, at: Date.now() }, ...h]);
      }
      return { ok: true, attestation, leveledTo: after > before ? after : undefined };
    },
    [user.xp, token, hydrate],
  );

  const grantXp = useCallback((n: number) => {
    // Demo helper (client-side). Not persisted to the server in API mode.
    setUser((u) => {
      const after = computeLevel(u.xp + n).level;
      const before = computeLevel(u.xp).level;
      if (after > before) setLastLevelUp(after);
      return { ...u, xp: u.xp + n };
    });
  }, []);

  // Fetch a sighting's plausibility verdict (API mode only), once per sighting per
  // session via the ref guard. A just-recorded sighting isn't indexed yet, so a miss
  // retries on a bounded interval until the server's verdict lands.
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
              setTimeout(attempt, 5000); // not indexed/assessed yet - keep waiting
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
  // the next sign-in mints a fresh session.
  const signOut = useCallback(() => {
    sessionToken.clear();
    setToken(null);
    setUser(INITIAL_USER);
    setGallery([]);
    setSightings(REAL_SIGHTINGS);
    setHistory([]);
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
  }, []);

  const value: GameValue = {
    user,
    level,
    quests,
    gallery,
    history,
    sightings,
    leaderboard,
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
    connectGuest,
    loginEmail,
    submitQuest,
    addLog,
    // mock: real persistence needs a backend endpoint that ties the profile name to
    // the account identity (not built yet).
    setHandle: (name) => setUser((u) => ({ ...u, handle: name })),
    grantXp,
    signOut,
    dismissLevelUp: () => setLastLevelUp(null),
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function useGame(): GameValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider>");
  return ctx;
}
