import type { Context } from "hono";

// Shared Hono environment: authed routes read the verified user id off context.
export type AppEnv = { Variables: { userId: string } };

export type AppContext = Context<AppEnv>;
