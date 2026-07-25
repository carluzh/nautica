import { integrations } from "../config";
import { log } from "../lib/logger";
import { getGallery } from "./subgraph";
import { primePlausibility } from "../routes/me";

// Eager plausibility. After a real on-chain record the sighting is not visible until
// The Graph indexes it (seconds to minutes). This polls the subgraph for the sighting
// whose id prefixes the recording txHash, then computes + caches its plausibility
// verdict so the gallery card can show it without the user re-opening anything.
// In-process, fire-and-forget, fail-soft: the lazy GET path stays the fallback.

const POLL_MS = 2500;
const MAX_ATTEMPTS = 36; // ~90s of indexing latency budget

async function findSightingId(userId: string, txHash: string): Promise<string | null> {
  const prefix = `${txHash.toLowerCase()}-`;
  const gallery = await getGallery(userId);
  const hit = gallery.find((g) => g.id.toLowerCase().startsWith(prefix));
  return hit?.id ?? null;
}

/** Kick off (fire-and-forget) the poll -> assess -> cache loop for one recorded
 *  sighting. No-op unless subgraph reads are live (nothing to index against otherwise). */
export function enqueuePlausibility(input: { userId: string; txHash: string }): void {
  if (!integrations.subgraph) return;
  const { userId, txHash } = input;
  void (async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      let sightingId: string | null = null;
      try {
        sightingId = await findSightingId(userId, txHash);
      } catch (err) {
        log.error("plausibility-job: subgraph lookup failed", { err: String(err), attempt });
        continue;
      }
      if (!sightingId) continue; // not indexed yet — keep polling
      try {
        const verdict = await primePlausibility(userId, sightingId);
        log.info("plausibility-job: verdict ready", { sightingId, verdict: verdict?.verdict, attempt });
      } catch (err) {
        log.error("plausibility-job: assess failed", { err: String(err), sightingId });
      }
      return;
    }
    log.info("plausibility-job: sighting not indexed within budget", { txHash });
  })();
}
