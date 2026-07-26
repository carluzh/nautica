import { Hono } from "hono";
import { z } from "zod";
import { createSession } from "../lib/session";
import { store } from "../lib/store";
import { deriveAddress } from "../lib/address";
import {
  emailUserId,
  guestUserId,
  hashPassword,
  newUser,
  verifyPassword,
} from "../lib/user";
import { registerPlayerOnchain } from "../services/chain";
import { getProfile } from "../services/subgraph";
import type { AppEnv } from "../lib/http";
import type { UserRecord } from "../lib/store";

export const authRoutes = new Hono<AppEnv>();

/** Mint a session token + resolve the profile for a freshly authenticated user. */
async function mintSession(user: UserRecord) {
  return { token: createSession(user.userId), profile: await getProfile(user.userId) };
}

/** POST /auth/guest - a fresh guest account with a deterministic derived address. */
authRoutes.post("/guest", async (c) => {
  const userId = guestUserId();
  const handle = "diver_" + userId.slice(-6);
  const user = store.createUser(newUser({ userId, handle }));
  // Best-effort: index the derived address on-chain (fire-and-forget, never blocks).
  void registerPlayerOnchain({ address: deriveAddress(userId), handle });
  return c.json(await mintSession(user));
});

const emailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/** POST /auth/email - find-or-create by email (register and login are one endpoint;
 *  the UI toggle is cosmetic). Same email always derives the same address. */
authRoutes.post("/email", async (c) => {
  const parsed = emailSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid email or password" }, 400);
  const { email, password } = parsed.data;
  const userId = emailUserId(email);

  const existing = store.getUser(userId);
  if (existing) {
    if (!existing.passwordHash || !verifyPassword(password, existing.passwordHash))
      return c.json({ error: "invalid email or password" }, 401);
    return c.json(await mintSession(existing));
  }

  const handle = email.split("@")[0] || "diver";
  const user = store.createUser(
    newUser({ userId, handle, passwordHash: hashPassword(password) }),
  );
  void registerPlayerOnchain({ address: deriveAddress(userId), handle });
  return c.json(await mintSession(user));
});
