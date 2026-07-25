"use client";

import { SeaMap, type SeaMarker } from "@/components/map/sea-map";
import { SPECIES_META } from "@/lib/game/content";
import { GameProvider, useGame } from "@/lib/game/provider";
import { TopBar } from "./top-bar";
import { LoginGate } from "./login-gate";
import { LevelUpOverlay } from "./level-up-overlay";
import { HistoryPanel } from "./panels/history-panel";
import { MissionsBoard } from "./panels/missions-board";
import { QuestSubmitDialog } from "./panels/quest-submit-dialog";
import { ProfileDialog } from "./panels/profile-dialog";
import { GalleryDialog } from "./panels/gallery-dialog";
import { SettingsDialog } from "./panels/settings-dialog";
import { PaymentsDialog } from "./panels/payments-dialog";
import { LeaderboardDialog } from "./panels/leaderboard-dialog";

function Hub() {
  const { gallery, setOpenPanel, user } = useGame();

  const markers: SeaMarker[] = gallery.map((g) => ({
    id: g.id,
    lng: g.lng,
    lat: g.lat,
    color: SPECIES_META[g.species].color,
    label: g.title,
    onClick: () => setOpenPanel("gallery"),
  }));

  return (
    <div className="relative h-svh w-full overflow-hidden bg-background">
      <SeaMap className="absolute inset-0" markers={markers} />

      {/* Floating chrome (each element manages its own pointer-events). */}
      <TopBar />
      <HistoryPanel />
      <MissionsBoard />

      {/* Modals — each binds to its own openPanel id via useGame(). */}
      <QuestSubmitDialog />
      <ProfileDialog />
      <GalleryDialog />
      <SettingsDialog />
      <PaymentsDialog />
      <LeaderboardDialog />

      <LevelUpOverlay />
      {!user.connected && <LoginGate />}
    </div>
  );
}

export function GameHub() {
  return (
    <GameProvider>
      <Hub />
    </GameProvider>
  );
}
