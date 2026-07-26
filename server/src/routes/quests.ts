import { Hono } from "hono";
import { z } from "zod";
import { integrations } from "../config";
import { log } from "../lib/logger";
import { levelForXp } from "../lib/levels";
import { resolvePlacement } from "../lib/geo";
import { questRegistry } from "../lib/quest-registry";
import { store } from "../lib/store";
import type { AppEnv } from "../lib/http";
import type { Hex } from "viem";
import { requireAuth } from "../middleware/auth";
import { issueChallenge, validateChallenge } from "../services/freshness";
import { classifyImage } from "../services/zerog";
import { recordQuestCompletion } from "../services/chain";
import { getQuests } from "../services/subgraph";
import { setSightingImage, setSightingRadius } from "../services/sighting-meta";
import { enqueuePlausibility } from "../services/sighting-jobs";
import { saveImageFromDataUrl } from "../services/image-store";
import type { ActivityEvent, GalleryItem, SubmitResult } from "../types";

const MIN_CONFIDENCE = 0.6; // a weak "pass" (low model confidence) does not award XP

// Daily rotation: the registry holds the full quest pool; the board shows just three
// quests - one from each difficulty tier (easy <=5 XP, medium <=20, hard >20) - and
// rotates every UTC day, so players get a fresh, balanced trio and everyone sees the
// same board. Completing a quest is still permanent (recorded per player on-chain).
function dailyBoard<T extends { reward: number }>(all: T[]): T[] {
  const day = Math.floor(Date.now() / 86_400_000);
  const easy: T[] = [];
  const medium: T[] = [];
  const hard: T[] = [];
  for (const q of all) (q.reward <= 5 ? easy : q.reward <= 20 ? medium : hard).push(q);
  return [easy, medium, hard].filter((t) => t.length > 0).map((t) => t[day % t.length]!);
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

/** GET /quests - daily board with this user's done status. */
questRoutes.get("/", async (c) => {
  const u = store.getUser(c.get("userId"));
  const done = new Set((u?.gallery ?? []).map((g) => g.questId));
  const onchain = await getQuests();
  return c.json({
    // Dynamic board: three quests from the registry pool (daily-rotated, balanced by
    // difficulty), joined with on-chain state. Empty registry -> quests: [].
    quests: dailyBoard(questRegistry.all()).map((q) => {
      const { createdAt, ...rest } = q;
      const oc = onchain[q.id];
      return {
        ...rest,
        status: done.has(q.id) ? "done" : "available",
        // additive on-chain truth (optional on the frozen contract)
        onchain: oc?.exists ?? false,
      };
    }),
  });
});

/** POST /quests/:id/challenge - issue a single-use freshness nonce. */
questRoutes.post("/:id/challenge", (c) => {
  const id = c.req.param("id");
  if (!questRegistry.get(id)) return c.json({ error: "unknown quest" }, 404);
  return c.json(issueChallenge(c.get("userId"), id));
});

/** POST /quests/:id/submit - verify a photo with 0G and, on pass, award XP. */
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

  const { lat, lng } = resolvePlacement(parsed.data);

  // Record on-chain (trusted attestor). If this throws, nothing landed - return
  // cleanly so a retry is safe (no duplicate on-chain record). The derived address
  // is always present, so guests record on-chain too.
  let chainRes: Awaited<ReturnType<typeof recordQuestCompletion>>;
  try {
    chainRes = await recordQuestCompletion({
      player: u.wallet as Hex,
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
    lat,
    lng,
    radiusM: parsed.data.radiusM,
    at: now,
    txHash: chainRes.simulated ? undefined : chainRes.txHash,
  };

  const activity: ActivityEvent[] = [
    { id: `a_${now}`, kind: "quest", title: quest.title, species: quest.species, xp: quest.reward, at: now },
  ];
  if (after > before) activity.unshift({ id: `a_${now}_lvl`, kind: "levelup", title: `Reached Level ${after}`, at: now });

  store.updateUser(userId, {
    xp: u.xp + quest.reward,
    gallery: [item, ...u.gallery],
    activity: [...activity, ...u.activity],
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
    // Only surface a real, broadcast Base tx (a simulated record never lands on-chain).
    txHash: chainRes.simulated ? undefined : chainRes.txHash,
  } satisfies SubmitResult);
});
