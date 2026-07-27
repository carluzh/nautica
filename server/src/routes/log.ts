import { randomUUID } from "node:crypto";
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
import { classifyImage } from "../services/zerog";
import { createQuestOnchain, recordQuestCompletion } from "../services/chain";
import { setSightingImage, setSightingRadius } from "../services/sighting-meta";
import { enqueuePlausibility } from "../services/sighting-jobs";
import { saveImageFromDataUrl } from "../services/image-store";
import { SPECIES_IDS } from "../types";
import type { ActivityEvent, GalleryItem, SpeciesId, SubmitResult } from "../types";

const MIN_CONFIDENCE = 0.6; // a weak "pass" (low model confidence) does not award XP
const LOG_XP = 15; // fixed award for a free-form logged sighting

const logSchema = z.object({
  imageDataUrl: z.string().min(16),
  description: z.string().min(3), // the 0G spec / assertion the photo must show
  species: z.enum(SPECIES_IDS).default("Other"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusM: z.number().optional(),
  anchorLat: z.number().optional(),
  anchorLng: z.number().optional(),
  nonce: z.string().optional(), // unused for now (no pre-existing quest to challenge)
});

export const logRoutes = new Hono<AppEnv>();
logRoutes.use("*", requireAuth);

/** POST /log - free-form "Add a sighting". Verifies the photo with 0G against the
 *  user's own description, awards fixed XP, and records it on-chain best-effort in
 *  the background so the UI resolves fast. */
logRoutes.post("/", async (c) => {
  const parsed = logSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid submission" }, 400);

  const userId = c.get("userId");
  const u = store.getUser(userId);
  if (!u) return c.json({ error: "user not found" }, 404);

  const { imageDataUrl, description, species } = parsed.data;

  // 0G verifiable classification against the user's own description. Award only on a
  // TEE-verified pass; in dev-mock (no 0G key) the attestation is honestly simulated,
  // so allow it there for testing.
  const attestation = await classifyImage({ imageDataUrl, spec: description, species });
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

  // Persist the photo so the gallery can show the actual finding. Best-effort.
  const savedImage = await saveImageFromDataUrl(imageDataUrl);
  const { lat, lng } = resolvePlacement(parsed.data);

  const before = levelForXp(u.xp);
  const after = levelForXp(u.xp + LOG_XP);
  const now = Date.now();
  // Stable per-log id, kept <=24 chars so questIdToBytes32's 31-byte cap can't truncate.
  const logId = "log-" + randomUUID().replace(/-/g, "").slice(0, 20);
  // Title with what 0G named the subject; fall back to the user's own description.
  // Capped: the model-supplied name is untrusted free text and flows into the
  // on-chain createQuest title string and the UI.
  const title = (attestation.name?.trim() || description).slice(0, 80);
  // Auto-categorize: only override the user's pick when they left it as "Other" and 0G
  // offered a concrete category. This species drives the gallery, activity, and the
  // on-chain createQuest below, so they stay consistent.
  const resolvedSpecies: SpeciesId =
    species === "Other" && attestation.suggestedSpecies && attestation.suggestedSpecies !== "Other"
      ? attestation.suggestedSpecies
      : (species as SpeciesId);

  const item: GalleryItem = {
    id: `g_${now}`,
    questId: logId,
    species: resolvedSpecies,
    title,
    photo: savedImage ? `/images/${savedImage.id}` : undefined,
    attestation,
    xp: LOG_XP,
    lat,
    lng,
    radiusM: parsed.data.radiusM,
    at: now,
  };

  const activity: ActivityEvent[] = [
    { id: `a_${now}`, kind: "quest", title, species: resolvedSpecies, xp: LOG_XP, at: now },
  ];
  if (after > before) activity.unshift({ id: `a_${now}_lvl`, kind: "levelup", title: `Reached Level ${after}`, at: now });

  // Award synchronously so the UI is fast; the on-chain record runs in the background.
  store.updateUser(userId, {
    xp: u.xp + LOG_XP,
    gallery: [item, ...u.gallery],
    activity: [...activity, ...u.activity],
  });

  // Background: create the quest on-chain (recordCompletion reverts QuestNotFound
  // otherwise) then record the completion under the derived address. Fire-and-forget;
  // swallow + log errors so a chain hiccup never affects the awarded XP.
  void (async () => {
    try {
      questRegistry.add({
        id: logId,
        title,
        spec: description,
        species: resolvedSpecies,
        reward: LOG_XP,
        createdAt: now,
      });
      await createQuestOnchain({ questId: logId, species: resolvedSpecies, title, xp: LOG_XP });
      const chainRes = await recordQuestCompletion({
        player: u.wallet as Hex,
        questId: logId,
        lat,
        lng,
        attestationHash: attestation.hash,
      });
      if (!chainRes.simulated) {
        if (parsed.data.radiusM != null) setSightingRadius(chainRes.txHash, parsed.data.radiusM);
        if (savedImage) setSightingImage(chainRes.txHash, savedImage.id);
        enqueuePlausibility({ userId, txHash: chainRes.txHash });
      }
    } catch (err) {
      log.error("log: background on-chain record failed", { err: String(err), logId });
    }
  })();

  return c.json({
    ok: true,
    attestation,
    xp: LOG_XP,
    leveledTo: after > before ? after : undefined,
  } satisfies SubmitResult);
});
