// FIELD APP - the Nautica citizen-science game hub. Full-bleed light SeaMap with
// floating chrome (top HUD, left activity feed, bottom-right missions) and the
// quest / profile / gallery / settings panels plus the add-a-sighting flow. All
// game state lives in the client GameProvider (lib/game/provider.tsx).
import { GameHub } from "@/components/app/game-hub";

export default function AppPage() {
  return <GameHub />;
}
