import Anthropic from "@anthropic-ai/sdk";
import { log } from "../lib/logger";
import type { GalleryItem, PlausibilityVerdict } from "../types";

// Optional LLM narration for the plausibility agent. Off unless ANTHROPIC_API_KEY
// is set; on failure it returns undefined and the caller keeps the deterministic
// verdict. This is the "agent" layer: Claude turns the subgraph-derived facts into
// one plain-language sentence. It never changes the verdict/score - narration only.

const enabled = Boolean(process.env.ANTHROPIC_API_KEY);

export async function narrate(
  verdict: PlausibilityVerdict,
  sighting: GalleryItem,
): Promise<string | undefined> {
  if (!enabled) return undefined;
  try {
    const client = new Anthropic();
    const facts = [
      `Species: ${sighting.species}`,
      `Location: ${sighting.lat.toFixed(3)}, ${sighting.lng.toFixed(3)}`,
      `Verdict: ${verdict.verdict} (score ${verdict.score})`,
      verdict.notable ? "Notable: invasive in this region" : "",
      verdict.rangeNote ? `Range: ${verdict.rangeNote}` : "",
      verdict.seasonNote ? `Season: ${verdict.seasonNote}` : "",
      verdict.corroboratingNearby ? `Nearby corroborating sightings: ${verdict.corroboratingNearby}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 200,
      output_config: { effort: "low" },
      system:
        "You are a marine field-science assistant. You are given facts a plausibility " +
        "agent derived from on-chain sighting data (The Graph). Write ONE concise, plain " +
        "sentence explaining the verdict to a citizen scientist. No preamble, no markdown.",
      messages: [{ role: "user", content: facts }],
    });

    const text = res.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    return text?.text.trim() || undefined;
  } catch (err) {
    log.error("narration: LLM call failed", { err: String(err) });
    return undefined;
  }
}
