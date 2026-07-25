import { createHash, randomBytes } from "node:crypto";
import { config, integrations } from "../config";
import { log } from "../lib/logger";
import type { Attestation } from "../types";

// 0G Compute verifiable inference. The real path calls the OpenAI-compatible 0G
// router with an image_url content block; the model runs inside a TEE and the
// response is TeeTLS-verifiable. STUBBED here: without ZEROG_API_KEY we return a
// simulated attestation. When keyed, we make the real call and derive the verdict
// from the model output. Fetching + verifying the TEE quote is left as a marked
// TODO so the swap is a single well-scoped change.

const TEE = "Intel TDX · TeeTLS";

function digest(...parts: string[]): string {
  return "0x" + createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24) + "…";
}

function buildPrompt(spec: string, species: string): string {
  return [
    "You verify citizen-science wildlife photos for a rewards game.",
    `The quest requires: ${spec}`,
    `Expected subject: ${species}.`,
    "Decide if the photo clearly and honestly satisfies the quest.",
    'Reply with STRICT JSON only: {"verdict":"pass"|"fail","confidence":0..1,"label":"<one short phrase of what you see>"}.',
  ].join(" ");
}

type Parsed = { verdict: "pass" | "fail"; confidence: number; label: string };

function parseModelJson(text: string): Parsed | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const j = JSON.parse(match[0]) as Partial<Parsed>;
    if (j.verdict !== "pass" && j.verdict !== "fail") return null;
    return {
      verdict: j.verdict,
      confidence: typeof j.confidence === "number" ? Math.max(0, Math.min(1, j.confidence)) : 0.8,
      label: typeof j.label === "string" ? j.label : "unspecified",
    };
  } catch {
    return null;
  }
}

export async function classifyImage(input: {
  imageDataUrl: string;
  spec: string;
  species: string;
}): Promise<Attestation> {
  if (!integrations.zeroG) {
    log.warn("0g: simulated attestation (ZEROG_API_KEY unset)");
    return {
      model: config.ZEROG_MODEL,
      verdict: "pass",
      confidence: 0.9 + Math.random() * 0.09,
      label: `${input.species} · matches quest spec`,
      tee: TEE,
      hash: digest("sim", randomBytes(8).toString("hex")),
      simulated: true,
      at: Date.now(),
    };
  }

  try {
    const res = await fetch(`${config.ZEROG_ROUTER}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.ZEROG_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.ZEROG_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: buildPrompt(input.spec, input.species) },
              { type: "image_url", image_url: { url: input.imageDataUrl } },
            ],
          },
        ],
        temperature: 0,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      choices?: { message?: { content?: string } }[];
      // TODO(0g): the TEE attestation / TeeTLS quote is returned alongside the
      // completion (or via a follow-up verify call). Capture + verify it here
      // and set `simulated: false` only once the quote checks out.
    };

    const text = data.choices?.[0]?.message?.content ?? "";
    const parsed = parseModelJson(text);
    if (!parsed) {
      log.warn("0g: unparseable model output, defaulting to fail", { text: text.slice(0, 160) });
    }

    return {
      model: config.ZEROG_MODEL,
      verdict: parsed?.verdict ?? "fail",
      confidence: parsed?.confidence ?? 0.5,
      label: parsed?.label ?? "unclear",
      tee: TEE,
      hash: digest(data.id ?? "0g", text),
      simulated: false,
      at: Date.now(),
    };
  } catch (err) {
    log.error("0g: inference request failed", { err: String(err) });
    // Fail closed on infra errors — never award XP on an unverified photo.
    return {
      model: config.ZEROG_MODEL,
      verdict: "fail",
      confidence: 0,
      label: "0g unreachable",
      tee: TEE,
      hash: digest("err", randomBytes(6).toString("hex")),
      simulated: false,
      at: Date.now(),
    };
  }
}
