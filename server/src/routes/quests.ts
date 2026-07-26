import { Hono } from "hono";
import { z } from "zod";
import { integrations } from "../config";
import { log } from "../lib/logger";
import { levelForXp, PAID_UNLOCK_LEVEL } from "../lib/levels";
import { questRegistry, type RegisteredQuest } from "../lib/quest-registry";
import { store } from "../lib/store";
import type { AppEnv } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { issueChallenge, validateChallenge } from "../services/freshness";
import { classifyImage } from "../services/zerog";
import { createQuestOnchain, recordQuestCompletion, relayerUsdcBalance, settlePayout } from "../services/chain";
import { getQuests } from "../services/subgraph";
import { setSightingImage, setSightingRadius } from "../services/sighting-meta";
import { enqueuePlausibility } from "../services/sighting-jobs";
import { saveImageFromDataUrl } from "../services/image-store";
import type { ActivityEvent, GalleryItem, Payment, SpeciesId, SubmitResult } from "../types";

const LISBON = { lng: -9.15, lat: 38.7 };
const MIN_CONFIDENCE = 0.6; // a weak "pass" (low model confidence) does not award XP
const MAX_PLACEMENT_KM = 5; // a submitted spot must sit within this of its GPS anchor

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
const submitSchema = z.object({
  imageDataUrl: z.string().min(16),
  nonce: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusM: z.number().optional(),
  anchorLat: z.number().optional(),
  anchorLng: z.number().optional(),
});

export const questRoutes = new Hono<AppEnv>();
questRoutes.use("*", requireAuth);

/** GET /quests - daily board with this user's done + paid-unlock status. */
questRoutes.get("/", async (c) => {
  const u = store.getUser(c.get("userId"));
  const done = new Set((u?.gallery ?? []).map((g) => g.questId));
  const paidUnlocked = levelForXp(u?.xp ?? 0) >= PAID_UNLOCK_LEVEL;
  const onchain = await getQuests();
  return c.json({
    // Dynamic board: driven by the registry (seeded quests + partner-created ones),
    // joined with on-chain state. Empty registry -> quests: [] (board renders empty).
    quests: questRegistry.all().map((q) => {
      const { createdAt, ...rest } = q;
      const oc = onchain[q.id];
      return {
        ...rest,
        status: done.has(q.id) ? "done" : "available",
        // additive on-chain truth (all optional on the frozen contract)
        onchain: oc?.exists ?? false,
        remainingUsd: oc?.remainingUsd,
        underfunded: oc?.underfunded,
      };
    }),
    paidUnlocked,
  });
});

// Partner-facing quest fields the escrow contract can't hold + the create args.
const createSchema = z
  .object({
    title: z.string().min(3).max(80),
    species: z.string().min(2).max(32),
    spec: z.string().min(3).max(400),
    requirements: z.array(z.string().min(1)).max(8).optional(),
    reward: z.number().int().min(1).max(1000), // XP
    usdc: z.number().min(0).max(10_000).default(0), // reward per completion
    funding: z.number().min(0).max(100_000).default(0), // USDC to escrow now
    partner: z.string().min(2).max(80),
  })
  .refine((v) => v.usdc === 0 || v.funding >= v.usdc, {
    message: "funding must cover at least one reward (funding >= usdc)",
    path: ["funding"],
  });

/** Derive a stable, on-chain-safe questId from the title + species. Kept <=24
 *  chars so questIdToBytes32 (utf8, 31-byte cap) never truncates it, and unique
 *  within the registry by suffixing a counter on collision. */
function slugQuestId(title: string, species: string): string {
  const base = `q-${title}-${species}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const trimmed = base.slice(0, 24) || "q-quest";
  let id = trimmed;
  let n = 1;
  while (questRegistry.has(id)) id = `${trimmed}-${n++}`;
  return id;
}

/** POST /quests - a research partner posts + funds a quest. Escrows the reward
 *  on-chain (relayer as funder) BEFORE the quest is added to the registry, so a
 *  reverted escrow never leaves a phantom quest on the board. */
questRoutes.post("/", async (c) => {
  const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "invalid quest" }, 400);
  const b = parsed.data;

  // Preflight: fail fast with a clear message when the relayer can't cover the escrow.
  if (b.funding > 0) {
    const bal = await relayerUsdcBalance();
    if (bal != null && bal < b.funding)
      return c.json({ error: `Relayer USDC balance ($${bal}) can't fund $${b.funding}.` }, 400);
  }

  const id = slugQuestId(b.title, b.species);
  const quest: RegisteredQuest = {
    id,
    kind: b.usdc > 0 ? "paid" : "free",
    title: b.title,
    spec: b.spec,
    species: b.species as SpeciesId,
    reward: b.reward,
    usdc: b.usdc > 0 ? b.usdc : undefined,
    partner: b.partner,
    requirements: b.requirements,
    createdAt: Date.now(),
  };

  // Chain-first: escrow, then register. A throw leaves the registry untouched.
  let chainRes: Awaited<ReturnType<typeof createQuestOnchain>>;
  try {
    chainRes = await createQuestOnchain({
      questId: id,
      species: quest.species,
      title: quest.title,
      xp: quest.reward,
      usdcReward: b.usdc,
      funding: b.funding,
    });
  } catch (err) {
    log.error("chain: createQuest failed", { err: String(err) });
    return c.json({ error: "On-chain quest creation failed; nothing was escrowed. Please try again." }, 502);
  }

  questRegistry.add(quest);
  const { createdAt: _c, ...q } = quest;
  return c.json({ quest: { ...q, status: "available" }, txHash: chainRes.txHash, simulated: chainRes.simulated });
});

/** POST /quests/:id/challenge - issue a single-use freshness nonce. */
questRoutes.post("/:id/challenge", (c) => {
  const id = c.req.param("id");
  if (!questRegistry.get(id)) return c.json({ error: "unknown quest" }, 404);
  return c.json(issueChallenge(c.get("userId"), id));
});

/** POST /quests/:id/submit - verify a photo with 0G and, on pass, award XP + settle. */
questRoutes.post("/:id/submit", async (c) => {
  const id = c.req.param("id");
  const quest = questRegistry.get(id);
  if (!quest) return c.json({ error: "unknown quest" }, 404);

  const parsed = submitSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid submission" }, 400);

  const userId = c.get("userId");
  const u = store.getUser(userId);
  if (!u) return c.json({ error: "user not found" }, 404);

  // Anti-farming: a quest can only be completed once (server is authoritative; the
  // board's "done" state is display-only and must not be the only guard).
  if (u.gallery.some((g) => g.questId === id))
    return c.json({ ok: false, reason: "You already completed this quest." } satisfies SubmitResult);

  // Paid-tier gating: Level 5 AND Passport verification AND an attached payout wallet.
  if (quest.kind === "paid") {
    if (levelForXp(u.xp) < PAID_UNLOCK_LEVEL)
      return c.json({ ok: false, reason: `Reach Level ${PAID_UNLOCK_LEVEL} to unlock paid quests.` } satisfies SubmitResult);
    // Demo: a Selfie (Face) verification is enough for paid quests (loosened from
    // the stricter Passport/Identity Check gate to keep the live flow smooth).
    if (!u.verification.face)
      return c.json({ ok: false, reason: "Selfie (Face) verification required for paid quests." } satisfies SubmitResult);
    if (!u.wallet)
      return c.json({ ok: false, reason: "Attach a wallet in Settings to receive payouts." } satisfies SubmitResult);
  }

  // Freshness: the photo must postdate a just-issued challenge (single-use).
  const fresh = validateChallenge({ nonce: parsed.data.nonce, userId, questId: id });
  if (!fresh.ok) return c.json({ ok: false, reason: fresh.reason } satisfies SubmitResult);

  // 0G verifiable classification. Award only on a TEE-verified pass; in dev-mock
  // (no 0G key) the attestation is honestly simulated, so allow it there for testing.
  const attestation = await classifyImage({
    imageDataUrl: parsed.data.imageDataUrl,
    spec: quest.spec,
    species: quest.species,
  });
  const verified = !attestation.simulated || !integrations.zeroG;
  const confident = attestation.confidence >= MIN_CONFIDENCE;
  if (attestation.verdict !== "pass" || !verified || !confident) {
    const reason =
      attestation.verdict !== "pass"
        ? `0G did not verify this shot (${attestation.label}).`
        : !verified
          ? "0G ran but its TEE attestation could not be verified; XP not awarded."
          : `0G wasn't confident enough about this shot (${Math.round(attestation.confidence * 100)}% · ${attestation.label}). Try a clearer photo.`;
    return c.json({ ok: false, reason, attestation } satisfies SubmitResult);
  }

  // Persist the photo so the gallery can show the actual finding (0G only classified
  // it, then dropped it). Content-addressed; served via GET /images/:id. Best-effort.
  const savedImage = await saveImageFromDataUrl(parsed.data.imageDataUrl);

  // Location is a soft, client-supplied signal. Use the chosen spot; if a GPS anchor
  // came with it, snap back to the anchor when the spot lands beyond the placement
  // leash (a photo can't be pinned an ocean away from where it was taken). Absent
  // coords keep a labeled Lisbon-area default. Fixed before the on-chain record so the
  // emitted event and the gallery item carry identical lat/lng.
  let lat = parsed.data.lat ?? LISBON.lat + (Math.random() - 0.5) * 0.4;
  let lng = parsed.data.lng ?? LISBON.lng + (Math.random() - 0.5) * 0.4;
  if (
    parsed.data.lat != null &&
    parsed.data.lng != null &&
    parsed.data.anchorLat != null &&
    parsed.data.anchorLng != null &&
    haversineKm(parsed.data.anchorLat, parsed.data.anchorLng, lat, lng) > MAX_PLACEMENT_KM
  ) {
    lat = parsed.data.anchorLat;
    lng = parsed.data.anchorLng;
  }

  // Record on-chain (trusted attestor). If this throws, nothing landed - return
  // cleanly so a retry is safe (no duplicate on-chain record).
  let chainRes: Awaited<ReturnType<typeof recordQuestCompletion>>;
  try {
    chainRes = await recordQuestCompletion({
      wallet: u.wallet,
      questId: id,
      lat,
      lng,
      attestationHash: attestation.hash,
    });
  } catch (err) {
    log.error("chain: recordCompletion failed", { err: String(err) });
    return c.json(
      { ok: false, reason: "On-chain record failed; XP not awarded. Please try again.", attestation } satisfies SubmitResult,
    );
  }

  const before = levelForXp(u.xp);
  const after = levelForXp(u.xp + quest.reward);
  const now = Date.now();

  const item: GalleryItem = {
    id: `g_${now}`,
    questId: id,
    species: quest.species,
    title: quest.title,
    photo: savedImage ? `/images/${savedImage.id}` : undefined,
    attestation,
    xp: quest.reward,
    usdc: quest.usdc,
    lat,
    lng,
    radiusM: parsed.data.radiusM,
    at: now,
    txHash: chainRes.simulated ? undefined : chainRes.txHash,
  };

  const activity: ActivityEvent[] = [
    { id: `a_${now}`, kind: "quest", title: quest.title, species: quest.species, xp: quest.reward, usdc: quest.usdc, at: now },
  ];
  if (after > before) activity.unshift({ id: `a_${now}_lvl`, kind: "levelup", title: `Reached Level ${after}`, at: now });

  // Settle payout best-effort: recordCompletion already landed, so the quest is
  // awarded regardless. A payout failure leaves the payment pending - never a 500
  // or an un-marked quest (which would let a retry duplicate the on-chain record).
  let payments = u.payments;
  let balanceUsd = u.balanceUsd;
  if (quest.kind === "paid" && quest.usdc) {
    let status: Payment["status"] = "settled";
    let txHash: string | undefined;
    try {
      txHash = (await settlePayout({ wallet: u.wallet, questId: id })).txHash;
    } catch (err) {
      log.error("chain: settlePayout failed; leaving payment pending", { err: String(err) });
      status = "pending";
    }
    const payment: Payment = {
      id: `p_${now}`,
      partner: quest.partner ?? "Research partner",
      quest: quest.title,
      usdc: quest.usdc,
      status,
      txHash,
      at: now,
    };
    payments = [payment, ...u.payments];
    if (status === "settled") {
      balanceUsd += quest.usdc;
      activity.unshift({ id: `a_${now}_pay`, kind: "payout", title: `Paid by ${payment.partner}`, usdc: quest.usdc, at: now });
    }
  }

  store.updateUser(userId, {
    xp: u.xp + quest.reward,
    balanceUsd,
    gallery: [item, ...u.gallery],
    activity: [...activity, ...u.activity],
    payments,
  });

  // Eager plausibility: once the sighting is genuinely on-chain, warm its verdict as
  // soon as The Graph indexes it (real path only; simulated-fallback records never
  // index, so they keep the lazy GET path). Also stash the off-chain precision radius.
  if (!chainRes.simulated) {
    if (parsed.data.radiusM != null) setSightingRadius(chainRes.txHash, parsed.data.radiusM);
    if (savedImage) setSightingImage(chainRes.txHash, savedImage.id);
    enqueuePlausibility({ userId, txHash: chainRes.txHash });
  }

  return c.json({
    ok: true,
    attestation,
    xp: quest.reward,
    leveledTo: after > before ? after : undefined,
    usdc: quest.usdc,
    // Only surface a real, broadcast Base tx (a simulated record never lands on-chain).
    txHash: chainRes.simulated ? undefined : chainRes.txHash,
  } satisfies SubmitResult);
});
