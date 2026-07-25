# Frontend ⇄ backend seam

This is the **contract boundary** between the frontend and the backend. It exists
so the frontend and backend can be built in parallel without stepping on each
other.

## The one rule

The frontend only ever touches **`useGame()`** (from `lib/game/provider`) and
**`lib/api/client.ts`**. It never imports anything from `server/`. The backend can
change freely as long as the response shapes in `client.ts` (which mirror
`server/src/types.ts`) stay the same.

## Two modes, one contract

`useGame()` is identical in both modes — panels never know which is active:

| | When | Data source |
|---|---|---|
| **Mock mode** | `NEXT_PUBLIC_API_URL` unset (default) | in-memory, seeded on sign-in |
| **API mode** | `NEXT_PUBLIC_API_URL` set | the backend (`server/`) via `lib/api/client.ts` |

**Frontend work needs no backend** — mock mode runs the whole game loop locally.
To test against the real server, set `NEXT_PUBLIC_API_URL=http://localhost:8080`
in `.env.local` and run the server (`cd server && npm run dev`).

## Running both (API mode)

```bash
# terminal 1 — backend
cd server && npm install && npm run dev      # :8080, stub integrations by default

# terminal 2 — frontend
cp .env.local.example .env.local             # keep NEXT_PUBLIC_API_URL=http://localhost:8080
npm run dev                                  # :3000
```

Sign in → the app calls `POST /auth/worldid`, stores the session token, and
hydrates from the server. Everything after (quests, submit, gallery, leaderboard)
flows through the API.

## Login / World ID

Sign-in currently sends a **dev-mock proof** (`devProof()` in `client.ts`), which
the backend accepts while its `WORLD_APP_ID` is unset. To wire real World ID:

1. Add `@worldcoin/idkit`, set `NEXT_PUBLIC_WORLD_APP_ID`.
2. In `provider.tsx` `connectWorldId()`, replace `devProof("device")` with the
   proof IDKit returns, and pass it to `api.loginWorldId(proof)`.

The backend side is already there — it just verifies whatever proof it receives.

## The API surface (frozen)

See `client.ts` for the typed methods and `server/README.md` for the routes:
`/auth/worldid`, `/auth/verify`, `/quests`, `/quests/:id/challenge`,
`/quests/:id/submit`, `/me`, `/me/gallery`, `/me/activity`, `/me/payments`,
`/leaderboard`.
