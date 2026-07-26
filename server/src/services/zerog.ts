import { createHash } from "node:crypto";
import { createPublicClient, getAddress, http, keccak256, toHex } from "viem";
import { config, integrations } from "../config";
import { log } from "../lib/logger";
import type { Attestation } from "../types";

// 0G Compute verifiable inference via the 0G Router (OpenAI-compatible). qwen3-vl-30b
// runs in a TEE; with verify_tee + the "verified" trust mode the Router validates
// the provider's TEE signature and returns x_0g_trace.tee_verified. `simulated` is
// derived in ONE place from that flag: false only on a genuine verification.
//
// We additionally read the serving provider's on-chain record (0G Serving contract)
// for verifiable provenance: its registered TEE signer, verifiability mode, and
// whether it has acknowledged its signer. That's public/independent data, not a
// re-verification. (Full independent signature self-verify needs the direct-broker
// path, which the Router path does not expose.) Without ZEROG_API_KEY it all
// short-circuits to an honestly-labelled simulated attestation.

type Trace = { tee_verified?: boolean | null; provider?: string; request_id?: string };
type Catalog = { verifiability: string; teeType: string; teeVerifier: string };
type Verdict = { verdict: "pass" | "fail"; confidence: number; label: string };
type ProviderService = {
  signer: string;
  verifiability: string;
  acknowledged: boolean;
  quoteVerified: boolean; // independent Intel TDX quote check (DCAP)
  quoteVerifier: string | null; // "automata-onchain" | "phala-offchain"
};

const FALLBACK_CATALOG: Catalog = { verifiability: "TeeTLS", teeType: "TDX", teeVerifier: "dstack" };
let catalogCache: Catalog | null = null;

async function getCatalog(): Promise<Catalog> {
  if (catalogCache) return catalogCache;
  try {
    const res = await fetch(`${config.ZEROG_ROUTER}/models`, { signal: AbortSignal.timeout(6000) });
    const data = (await res.json().catch(() => ({}))) as { data?: Array<Record<string, unknown>> };
    const m = data.data?.find((x) => x.id === config.ZEROG_MODEL);
    catalogCache = m
      ? {
          verifiability: String(m.verifiability ?? FALLBACK_CATALOG.verifiability),
          teeType: String(m.tee_type ?? FALLBACK_CATALOG.teeType),
          teeVerifier: String(m.tee_verifier ?? FALLBACK_CATALOG.teeVerifier),
        }
      : FALLBACK_CATALOG;
  } catch {
    catalogCache = FALLBACK_CATALOG;
  }
  return catalogCache;
}

function buildPrompt(spec: string, species: string): string {
  return [
    "You verify photos for a citizen-science coastal game, and you guard against cheating.",
    `The quest requires: ${spec}`,
    species && species !== "Other" ? `The expected subject is a ${species}.` : "",
    "PASS only if this is a genuine, first-hand photograph that clearly satisfies what the quest requires.",
    "FAIL if what the quest requires is absent or does not match.",
    "FAIL if it is not a genuine real-world photograph: reject photos of a screen or monitor, screenshots, printouts or a photo of another photo, drawings, paintings, illustrations, 3D renders, toys, or obvious stock or watermarked images.",
    "Watch for signs of a re-photographed screen or print: moire patterns, an LCD pixel grid, screen glare or bezels, paper or print-dot texture, watermarks, or on-screen UI.",
    "If you are unsure whether the photo genuinely satisfies the quest, lower your confidence instead of guessing pass.",
    'Reply with STRICT JSON only, no prose: {"verdict":"pass"|"fail","confidence":0..1,"label":"<short phrase: what you see, or why it failed>"}.',
  ].filter(Boolean).join(" ");
}

function parseModelJson(text: string): Verdict | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const j = JSON.parse(match[0]) as Partial<Verdict>;
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

// ---- On-chain provenance: the provider's 0G Serving record --------------------

// Inference Serving.getService(provider) - the current mainnet struct (has the
// registered teeSignerAddress + acknowledgement). ZEROG_SERVING_ADDRESS defaults to
// the mainnet Serving contract; a read failure just omits the provenance fields.
const SERVING_ABI = [
  {
    type: "function",
    name: "getService",
    stateMutability: "view",
    inputs: [{ name: "provider", type: "address" }],
    outputs: [
      {
        type: "tuple",
        name: "service",
        components: [
          { name: "provider", type: "address" },
          { name: "serviceType", type: "string" },
          { name: "url", type: "string" },
          { name: "inputPrice", type: "uint256" },
          { name: "outputPrice", type: "uint256" },
          { name: "updatedAt", type: "uint256" },
          { name: "model", type: "string" },
          { name: "verifiability", type: "string" },
          { name: "additionalInfo", type: "string" },
          { name: "teeSignerAddress", type: "address" },
          { name: "teeSignerAcknowledged", type: "bool" },
        ],
      },
    ],
  },
] as const;

let publicClient: ReturnType<typeof createPublicClient> | null = null;
function chainClient() {
  if (!publicClient) publicClient = createPublicClient({ transport: http(config.ZEROG_CHAIN_RPC) });
  return publicClient;
}

// --- DCAP: independently verify the provider's Intel TDX attestation quote -----
// Cross-check the on-chain teeSignerAddress against the quote's report_data, then
// verify the quote against Intel's root of trust: Automata's on-chain DCAP verifier
// (trustless, a free eth_call) with Phala's off-chain verifier as a fallback.
const DCAP_ABI = [
  {
    type: "function",
    name: "verifyAndAttestOnChain",
    stateMutability: "view",
    inputs: [{ name: "rawQuote", type: "bytes" }],
    outputs: [
      { name: "success", type: "bool" },
      { name: "output", type: "bytes" },
    ],
  },
] as const;

let dcapPublicClient: ReturnType<typeof createPublicClient> | null = null;
function dcapClient() {
  if (!dcapPublicClient) dcapPublicClient = createPublicClient({ transport: http(config.ZEROG_DCAP_RPC) });
  return dcapPublicClient;
}

async function verifyQuoteAutomata(quoteHex: `0x${string}`): Promise<boolean> {
  try {
    const r = (await dcapClient().readContract({
      address: getAddress(config.ZEROG_DCAP_VERIFIER),
      abi: DCAP_ABI,
      functionName: "verifyAndAttestOnChain",
      args: [quoteHex],
    })) as readonly [boolean, string];
    return r[0] === true;
  } catch {
    return false;
  }
}

async function verifyQuotePhala(quoteHex: string): Promise<boolean> {
  try {
    const res = await fetch("https://cloud-api.phala.network/api/v1/attestations/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hex: quoteHex }),
      signal: AbortSignal.timeout(12000),
    });
    const j = (await res.json().catch(() => ({}))) as { verified?: boolean };
    return j.verified === true;
  } catch {
    return false;
  }
}

/** Fetch the provider's TDX quote, bind it to the on-chain signer, verify it. Best-effort. */
async function verifyProviderQuote(
  url: string,
  signer: string,
): Promise<{ quoteVerified: boolean; quoteVerifier: string | null }> {
  const none = { quoteVerified: false, quoteVerifier: null };
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/v1/quote`, { signal: AbortSignal.timeout(8000) });
    const q = (await res.json().catch(() => ({}))) as { quote?: string; report_data?: string };
    if (!q.quote || !q.report_data) return none;
    // report_data (base64) decodes to the ASCII signer address -> binds the quote to the on-chain signer.
    const reportSigner = Buffer.from(q.report_data, "base64").toString("utf8").replace(/\0+$/, "").trim();
    if (reportSigner.toLowerCase() !== signer.toLowerCase()) return none;
    const hexArg = (q.quote.startsWith("0x") ? q.quote : `0x${q.quote}`) as `0x${string}`;
    if (await verifyQuoteAutomata(hexArg)) return { quoteVerified: true, quoteVerifier: "automata-onchain" };
    if (await verifyQuotePhala(q.quote)) return { quoteVerified: true, quoteVerifier: "phala-offchain" };
    return none;
  } catch (err) {
    log.warn("0g: quote verification failed", { err: String(err) });
    return none;
  }
}

// Cached per provider (providers are stable), so it's one read per provider, not per call.
const serviceCache = new Map<string, ProviderService | null>();
async function resolveProviderService(provider: string): Promise<ProviderService | null> {
  if (!config.ZEROG_SERVING_ADDRESS) return null;
  const key = provider.toLowerCase();
  const cached = serviceCache.get(key);
  if (cached !== undefined) return cached;
  let result: ProviderService | null = null;
  try {
    const s = (await chainClient().readContract({
      address: getAddress(config.ZEROG_SERVING_ADDRESS),
      abi: SERVING_ABI,
      functionName: "getService",
      args: [getAddress(provider)],
    })) as { url: string; teeSignerAddress: string; verifiability: string; teeSignerAcknowledged: boolean };
    const quote = await verifyProviderQuote(s.url, s.teeSignerAddress);
    result = {
      signer: s.teeSignerAddress,
      verifiability: s.verifiability,
      acknowledged: s.teeSignerAcknowledged,
      ...quote,
    };
  } catch (err) {
    log.warn("0g: provider service lookup failed", { err: String(err) });
  }
  serviceCache.set(key, result);
  return result;
}

// ---- Attestation mapping (the ONE place simulated/teeVerified are computed) --

export function buildAttestation(p: {
  model: string;
  verdict: "pass" | "fail";
  confidence: number;
  label: string;
  outputText: string;
  catalog: Catalog;
  trace?: Trace;
  chatId?: string | null;
  source: "verify_tee" | "simulated" | "error";
  service?: ProviderService | null;
}): Attestation {
  const teeVerified = p.trace?.tee_verified === true; // Router-attested TEE verification
  const simulated = !teeVerified;

  const provider = p.trace?.provider ?? null;
  const chatId = p.chatId ?? null;
  const outputHash = "0x" + createHash("sha256").update(p.outputText).digest("hex");
  const hash = keccak256(toHex(`${provider ?? ""}|${chatId ?? ""}|${p.model}|${outputHash}|${teeVerified}`));

  const attestationSource: Attestation["attestationSource"] = teeVerified
    ? "0g-router:verify_tee"
    : p.source === "simulated"
      ? "simulated"
      : p.source === "error"
        ? "error"
        : "unverified";
  const tee = teeVerified
    ? `${p.catalog.teeType} · ${p.catalog.verifiability}`
    : p.source === "simulated"
      ? "simulated (no 0G key)"
      : "unverified";

  return {
    model: p.model,
    verdict: p.verdict,
    confidence: p.confidence,
    label: p.label,
    tee,
    hash,
    simulated,
    teeVerified,
    attestationSource,
    provider,
    requestId: p.trace?.request_id ?? null,
    chatId,
    verifiability: p.catalog.verifiability,
    teeType: p.catalog.teeType,
    teeVerifier: p.catalog.teeVerifier,
    outputHash,
    teeSigner: p.service?.signer ?? null,
    providerVerifiability: p.service?.verifiability ?? null,
    providerAcknowledged: p.service?.acknowledged ?? null,
    quoteVerified: p.service?.quoteVerified ?? null,
    quoteVerifier: p.service?.quoteVerifier ?? null,
    at: Date.now(),
  };
}

// Retry only transport failures (429 / 5xx / network / timeout), each with a fresh
// 30s timeout. A 200 with tee_verified:false is a real verdict and a 4xx is our
// bug, so neither is retried. Exhausting retries throws into the caller's catch
// (fail closed). This matters because the freshness nonce is already consumed, so
// a transient blip would otherwise burn a valid submission.
async function postWithRetry(url: string, init: RequestInit): Promise<Response> {
  const backoff = [500, 1500];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= backoff.length; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, backoff[attempt - 1]));
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
      if (res.status !== 429 && res.status < 500) return res;
      lastErr = new Error(`0g router ${res.status}`);
      res.body?.cancel();
      log.warn("0g: transient router status, retrying", { status: res.status, attempt });
    } catch (err) {
      lastErr = err;
      log.warn("0g: transport error, retrying", { err: String(err), attempt });
    }
  }
  throw lastErr;
}

export async function classifyImage(input: {
  imageDataUrl: string;
  spec: string;
  species: string;
}): Promise<Attestation> {
  const catalog = await getCatalog();

  if (!integrations.zeroG) {
    log.warn("0g: simulated attestation (ZEROG_API_KEY unset)");
    return buildAttestation({
      model: config.ZEROG_MODEL,
      verdict: "pass",
      confidence: 0.92,
      label: `${input.species} · matches quest spec`,
      outputText: `simulated:${input.species}`,
      catalog,
      source: "simulated",
    });
  }

  try {
    const res = await postWithRetry(`${config.ZEROG_ROUTER}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.ZEROG_API_KEY}`,
        "X-0G-Provider-Trust-Mode": "verified", // route to a verifiable (TeeTLS/TeeML) provider
      },
      body: JSON.stringify({
        model: config.ZEROG_MODEL,
        verify_tee: true, // Router extension: turns on the synchronous TEE-signature check
        response_format: { type: "json_object" }, // guarantee syntactic JSON content
        seed: 42, // pin sampling (deterministic; belt-and-suspenders with temperature:0)
        temperature: 0,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: buildPrompt(input.spec, input.species) },
              { type: "image_url", image_url: { url: input.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    const chatIdHeader = res.headers.get("ZG-Res-Key");
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      model?: string;
      choices?: { message?: { content?: string } }[];
      x_0g_trace?: Trace;
    };

    const text = data.choices?.[0]?.message?.content ?? "";
    const parsed = parseModelJson(text);
    if (!parsed) log.warn("0g: unparseable model output, failing closed", { text: text.slice(0, 160) });

    const provider = data.x_0g_trace?.provider;
    const service = provider ? await resolveProviderService(provider) : null;

    return buildAttestation({
      model: data.model ?? config.ZEROG_MODEL,
      verdict: parsed?.verdict ?? "fail",
      confidence: parsed?.confidence ?? 0.5,
      label: parsed?.label ?? "unclear",
      outputText: text,
      catalog,
      trace: data.x_0g_trace,
      chatId: chatIdHeader ?? data.id ?? null,
      source: "verify_tee",
      service,
    });
  } catch (err) {
    log.error("0g: inference request failed", { err: String(err) });
    // Fail closed: an infra error is NOT a verified pass.
    return buildAttestation({
      model: config.ZEROG_MODEL,
      verdict: "fail",
      confidence: 0,
      label: "0g unreachable",
      outputText: "error",
      catalog,
      source: "error",
    });
  }
}
