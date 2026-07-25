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

Sign in → the app calls `POST /auth/worldid`, stores the session token, and
hydrates from the server. Everything after (quests, submit, gallery, leaderboard)
flows through the API.

## Login / World ID (IDKit 4.0)

Real World ID is wired. The frontend reads **no** World env var: it calls
`GET /auth/worldid/context?credential=…`, and the backend returns the `app_id`,
pinned `action`, signed `rp_context`, and a `simulated` flag. That flag is the
single source of truth for mode:

- `simulated: true` (backend has no real World app) → the client submits a
  `devIdkitResponse()` and the dev-mock backend accepts it.
- `simulated: false` → the client opens the real `IDKitRequestWidget`
  (`components/app/worldid-widget.tsx`) with the credential's preset
  (`selfieCheckLegacy` / `orbLegacy` / `identityCheck`) and forwards the proof to
  `POST /auth/worldid` (login) or `POST /auth/verify` (tier upgrade).

Real mode needs `WORLD_APP_ID` + `WORLD_RP_ID` + `WORLD_RP_SIGNING_KEY` set on the
backend (see `server/.env.example`).

## The API surface (frozen)

See `client.ts` for the typed methods and `server/README.md` for the routes:

- **Auth** - `GET /auth/worldid/context`, `POST /auth/worldid`, `POST /auth/verify`,
  `POST /auth/google`, `GET /auth/nonce` (SIWE), `POST /auth/wallet` (SIWE)
- **Quests** - `GET /quests`, `POST /quests` (partner create + fund),
  `POST /quests/:id/challenge`, `POST /quests/:id/submit`
- **Me** - `GET /me`, `POST /me/wallet`, `POST /me/demo-level` (demo skip to L5),
  `GET /me/gallery`, `GET /me/activity`, `GET /me/payments`,
  `GET /me/sightings/:id/plausibility` (The Graph plausibility agent)
- **Leaderboard** - `GET /leaderboard`
