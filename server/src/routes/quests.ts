import { Hono } from "hono";
import { z } from "zod";
import { DAILY_QUESTS, getQuest } from "../content";
import { levelForXp, PAID_UNLOCK_LEVEL } from "../lib/levels";
import { store } from "../lib/store";
import type { AppEnv } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { issueChallenge, validateChallenge } from "../services/freshness";
import { classifyImage } from "../services/zerog";
import { recordQuestCompletion, settlePayout } from "../services/chain";
import type { ActivityEvent, GalleryItem, Payment, SubmitResult } from "../types";

const LISBON = { lng: -9.15, lat: 38.7 };
const submitSchema = z.object({
  imageDataUrl: z.string().min(16),
  nonce: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const questRoutes = new Hono<AppEnv>();
questRoutes.use("*", requireAuth);

/** GET /quests — daily board with this user's done + paid-unlock status. */
questRoutes.get("/", (c) => {
  const u = store.getUser(c.get("userId"));
  const done = new Set((u?.gallery ?? []).map((g) => g.questId));
  const paidUnlocked = levelForXp(u?.xp ?? 0) >= PAID_UNLOCK_LEVEL;
  return c.json({
    quests: DAILY_QUESTS.map((q) => ({ ...q, status: done.has(q.id) ? "done" : "available" })),
    paidUnlocked,
  });
});

/** POST /quests/:id/challenge — issue a single-use freshness nonce. */
questRoutes.post("/:id/challenge", (c) => {
  const id = c.req.param("id");
  if (!getQuest(id)) return c.json({ error: "unknown quest" }, 404);
  return c.json(issueChallenge(c.get("userId"), id));
});

/** POST /quests/:id/submit — verify a photo with 0G and, on pass, award XP + settle. */
questRoutes.post("/:id/submit", async (c) => {
  const id = c.req.param("id");
  const quest = getQuest(id);
  if (!quest) return c.json({ error: "unknown quest" }, 404);

  const parsed = submitSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid submission" }, 400);

  const userId = c.get("userId");
  const u = store.getUser(userId);
  if (!u) return c.json({ error: "user not found" }, 404);

  // Paid-tier gating: Level 5 AND Passport verification (payouts need the stronger proof).
  if (quest.kind === "paid") {
    if (levelForXp(u.xp) < PAID_UNLOCK_LEVEL)
      return c.json({ ok: false, reason: `Reach Level ${PAID_UNLOCK_LEVEL} to unlock paid quests.` } satisfies SubmitResult);
    if (!u.verification.passport)
      return c.json({ ok: false, reason: "Passport (Identity Check) verification required for paid quests." } satisfies SubmitResult);
  }

  // Freshness: the photo must postdate a just-issued challenge (single-use).
  const fresh = validateChallenge({ nonce: parsed.data.nonce, userId, questId: id });
  if (!fresh.ok) return c.json({ ok: false, reason: fresh.reason } satisfies SubmitResult);

  // 0G verifiable classification.
  const attestation = await classifyImage({
    imageDataUrl: parsed.data.imageDataUrl,
    spec: quest.spec,
    species: quest.species,
  });
  if (attestation.verdict !== "pass") {
    return c.json({ ok: false, reason: `0G did not verify this shot (${attestation.label}).`, attestation } satisfies SubmitResult);
  }

  // Passed: record on-chain (trusted attestor), award XP, settle any payout.
  const chainRes = await recordQuestCompletion({
    wallet: u.wallet,
    questId: id,
    xp: quest.reward,
    attestationHash: attestation.hash,
  });

  const before = levelForXp(u.xp);
  const after = levelForXp(u.xp + quest.reward);
  const now = Date.now();

  const item: GalleryItem = {
    id: `g_${now}`,
    questId: id,
    species: quest.species,
    title: quest.title,
    attestation,
    xp: quest.reward,
    usdc: quest.usdc,
    lat: parsed.data.lat ?? LISBON.lat + (Math.random() - 0.5) * 0.4,
    lng: parsed.data.lng ?? LISBON.lng + (Math.random() - 0.5) * 0.4,
    at: now,
  };

  const activity: ActivityEvent[] = [
    { id: `a_${now}`, kind: "quest", title: quest.title, species: quest.species, xp: quest.reward, usdc: quest.usdc, at: now },
  ];
  if (after > before) activity.unshift({ id: `a_${now}_lvl`, kind: "levelup", title: `Reached Level ${after}`, at: now });

  let payments = u.payments;
  let balanceUsd = u.balanceUsd;
  if (quest.kind === "paid" && quest.usdc) {
    const payout = await settlePayout({ wallet: u.wallet, usdc: quest.usdc });
    const payment: Payment = {
      id: `p_${now}`,
      partner: quest.partner ?? "Research partner",
      quest: quest.title,
      usdc: quest.usdc,
      status: "settled",
      txHash: payout.txHash,
      at: now,
    };
    payments = [payment, ...u.payments];
    balanceUsd += quest.usdc;
    activity.unshift({ id: `a_${now}_pay`, kind: "payout", title: `Paid by ${payment.partner}`, usdc: quest.usdc, at: now });
  }

  store.updateUser(userId, {
    xp: u.xp + quest.reward,
    balanceUsd,
    gallery: [item, ...u.gallery],
    activity: [...activity, ...u.activity],
    payments,
  });

  return c.json({
    ok: true,
    attestation,
    xp: quest.reward,
    leveledTo: after > before ? after : undefined,
    usdc: quest.usdc,
    txHash: chainRes.txHash,
  } satisfies SubmitResult);
});
