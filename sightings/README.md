# Sightings

Real community sightings that the app map renders instead of the faked
`SEED_SIGHTINGS` layer. These are historical, research-grade citizen-science
observations pulled from iNaturalist (open, keyless), normalized onto the app's
existing `Sighting` type, and committed as JSON. There are no client or runtime
API calls: the data is prebuilt.

## Files

- `pull-sightings.ts` — one-shot, re-runnable build step that fetches and
  normalizes the observations.
- `sightings.real.json` — the committed output the app imports.
- `index.ts` — exports `REAL_SIGHTINGS` (the JSON typed as `Sighting[]`).

## Regions

Two bounding boxes:

- Lisbon coast (Lisbon to Cascais)
- Mallorca

The query is biased server-side toward marine and coastal iconic taxa, and
clearly terrestrial taxa (birds, insects, mammals, arachnids, fungi) are dropped
so the map reads marine.

## Photos and licensing

Occurrence facts are free to use. Photos are not. A photo is surfaced only when
it carries a Creative Commons license (`cc0`, `cc-by`, `cc-by-nc`, `cc-by-sa`,
`cc-by-nd`, `cc-by-nc-sa`, `cc-by-nc-nd`); everything else renders as a dot with
no image. Each photo carries a per-observation credit line, for example
`© observer · iNaturalist · CC-BY-NC`, which the marker popup shows.

## Attribution

Observations from iNaturalist, CC-licensed, © individual observers.

## Re-running

```
npx tsx sightings/pull-sightings.ts
```

This rewrites `sightings.real.json`. iNaturalist etiquette keeps the puller under
one request per second, so a full run takes a moment.
