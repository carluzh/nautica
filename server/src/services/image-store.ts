import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { log } from "../lib/logger";
import { setSightingImageRoot } from "./sighting-meta";

// Persists finding photos so the gallery can show real images. The submitted photo
// was previously handed to 0G for classification and then DISCARDED; nothing kept it.
//
// Content-addressed (sha256): identical photos dedupe and the id is a stable locator.
// Disk-backed for fast local serving via GET /images/:id. This same layer is the cache
// in front of 0G Storage: 0G holds the durable, decentralized copy + provenance root,
// while the server streams the cached bytes to the browser (you never want to pull from
// storage nodes on every <img> render).

const IMAGE_DIR = process.env.IMAGE_DIR ?? "./.data/images";
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const CT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

let ready: Promise<void> | null = null;
function ensureDir(): Promise<void> {
  if (!ready) ready = mkdir(IMAGE_DIR, { recursive: true }).then(() => undefined);
  return ready;
}

/** Parse a data URL into its content type + raw bytes. Null if not a data URL. */
function parseDataUrl(dataUrl: string): { contentType: string; bytes: Buffer } | null {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  const contentType = m[1] || "application/octet-stream";
  const payload = m[3] ?? "";
  const bytes = m[2]
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");
  return { contentType, bytes };
}

export type SavedImage = { id: string; contentType: string; bytes: number };

/** Persist a submitted photo (data URL). Returns a content-addressed id used to serve
 *  it back via GET /images/:id. Fails soft (null) so a storage hiccup never blocks XP. */
export async function saveImageFromDataUrl(dataUrl: string): Promise<SavedImage | null> {
  try {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) return null;
    const { contentType, bytes } = parsed;
    const ext = EXT[contentType] ?? "bin";
    const sha = createHash("sha256").update(bytes).digest("hex");
    const id = `${sha}.${ext}`;
    await ensureDir();
    const path = join(IMAGE_DIR, id);
    const exists = await access(path).then(() => true).catch(() => false);
    if (!exists) await writeFile(path, bytes);
    // Decentralized provenance on 0G Storage (best-effort, off the response path).
    void uploadToZeroGStorage(id, bytes, contentType);
    return { id, contentType, bytes: bytes.length };
  } catch (err) {
    log.error("image-store: save failed", { err: String(err) });
    return null;
  }
}

/** Read a stored image by id (for GET /images/:id). */
export async function readImage(id: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  // ids are `<sha256>.<ext>` — reject anything else so the id can't traverse the fs.
  if (!/^[a-f0-9]{64}\.[a-z0-9]{2,5}$/.test(id)) return null;
  try {
    const bytes = await readFile(join(IMAGE_DIR, id));
    const ext = id.split(".").pop() ?? "bin";
    return { bytes, contentType: CT[ext] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

// ---- 0G Storage provenance backend ------------------------------------------
// Uploads the exact bytes to 0G Storage for a decentralized, content-addressed record
// (a root hash), completing the full-0G-stack story: Compute verifies the photo, Storage
// holds it. Serving still comes from the local cache above (speed); 0G is the durable
// copy + provenance. Activates when a funded 0G storage key + indexer are configured:
//   ZEROG_STORAGE_INDEXER   (e.g. https://indexer-storage-testnet-turbo.0g.ai)
//   ZEROG_STORAGE_RPC       (0G chain RPC used to submit the storage tx)
//   ZEROG_STORAGE_KEY       (funded 0G wallet private key — pays the small storage fee)
// The upload itself (via @0glabs/0g-ts-sdk) is wired in once that key is provisioned;
// until then this is a no-op and the local store fully serves the gallery.
const zeroGReady = Boolean(
  process.env.ZEROG_STORAGE_INDEXER && process.env.ZEROG_STORAGE_KEY,
);

async function uploadToZeroGStorage(id: string, bytes: Buffer, _contentType: string): Promise<void> {
  if (!zeroGReady) return;
  try {
    const root = await zeroGUpload(bytes);
    if (root) setSightingImageRoot(id, root);
  } catch (err) {
    log.error("image-store: 0G Storage upload failed (served from cache)", { err: String(err), id });
  }
}

// Placeholder for the @0glabs/0g-ts-sdk upload flow (merkle root -> submit -> confirm).
// Returns the storage root hash. Left unimplemented until the funded key + indexer land.
async function zeroGUpload(_bytes: Buffer): Promise<string | null> {
  return null;
}
