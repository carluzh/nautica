// Shared location resolver for sighting submissions. Location is a soft,
// client-supplied signal: use the chosen spot; if a GPS anchor came with it, snap
// back to the anchor when the spot lands beyond the placement leash (a photo can't
// be pinned an ocean away from where it was taken). Absent coords keep a labeled
// Lisbon-area default. Fixed before the on-chain record so the emitted event and
// the gallery item carry identical lat/lng.

const LISBON = { lng: -9.15, lat: 38.7 };
const MAX_PLACEMENT_KM = 5; // a submitted spot must sit within this of its GPS anchor

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function resolvePlacement(input: {
  lat?: number;
  lng?: number;
  anchorLat?: number;
  anchorLng?: number;
}): { lat: number; lng: number } {
  let lat = input.lat ?? LISBON.lat + (Math.random() - 0.5) * 0.4;
  let lng = input.lng ?? LISBON.lng + (Math.random() - 0.5) * 0.4;
  if (
    input.lat != null &&
    input.lng != null &&
    input.anchorLat != null &&
    input.anchorLng != null &&
    haversineKm(input.anchorLat, input.anchorLng, lat, lng) > MAX_PLACEMENT_KM
  ) {
    lat = input.anchorLat;
    lng = input.anchorLng;
  }
  return { lat, lng };
}
