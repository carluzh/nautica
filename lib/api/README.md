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

`useGame()` is identical in both modes - panels never know which is active:

| | When | Data source |
|---|---|---|
| **Mock mode** | `NEXT_PUBLIC_API_URL` unset (default) | in-memory, seeded on sign-in |
| **API mode** | `NEXT_PUBLIC_API_URL` set | the backend (`server/`) via `lib/api/client.ts` |

**Frontend work needs no backend** - mock mode runs the whole game loop locally.
To test against the real server, set `NEXT_PUBLIC_API_URL=http://localhost:8080`
in `.env.local` and run the server (`cd server && npm run dev`).

## Running both (API mode)

```bash
# terminal 1 - backend
cd server && npm install && npm run dev      # :8080, stub integrations by default

# terminal 2 - frontend
cp .env.local.example .env.local             # keep NEXT_PUBLIC_API_URL=http://localhost:8080
npm run dev                                  # :3000
```

Sign in → the app calls `POST /auth/guest` or `POST /auth/email`, stores the
session token, and hydrates from the server. Everything after (quests, submit,
log, gallery, leaderboard) flows through the API.

## Login (guest + email/password)

Auth is guest or email/password. There is no auth-provider env var:

- **Guest** - `POST /auth/guest` mints a fresh account + session (no credentials).
- **Email** - `POST /auth/email { email, password }` is find-or-create: the same
  endpoint registers a new account or logs into an existing one (the UI toggle is
  cosmetic). The password is sent plaintext over HTTPS; the server hashes it with
  scrypt.

Every account gets a deterministic, read-only derived on-chain address used as the
leaderboard/index key. The relayer is the sole on-chain caller.

## The API surface (frozen)

See `client.ts` for the typed methods and `server/README.md` for the routes:

- **Auth** - `POST /auth/guest`, `POST /auth/email`
- **Quests** - `GET /quests`, `POST /quests/:id/challenge`, `POST /quests/:id/submit`
- **Log** - `POST /log` (free-form photo + description → 0G-verified sighting)
- **Me** - `GET /me`, `GET /me/gallery`, `GET /me/activity`,
  `GET /me/sightings/:id/plausibility` (The Graph plausibility agent)
- **Leaderboard** - `GET /leaderboard`
