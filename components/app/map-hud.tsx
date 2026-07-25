"use client";

import { Flame, Images, LocateFixed, Lock, Settings, Wallet, type LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGame } from "@/lib/game/provider";
import type { PanelId } from "@/lib/game/types";
import { LevelRing } from "./level-ring";

/**
 * Floating top-right HUD over the map: level, streak, quick-action dialogs, and
 * the profile avatar — the only floating chrome besides the map (the logo and the
 * category tabs live in the left sidebar).
 */
export function MapHud({
  showRecenter = false,
  onRecenter,
}: {
  /** Show the "back to my location" button (only once the view is panned off you). */
  showRecenter?: boolean;
  onRecenter?: () => void;
}) {
  const { user, level, paidUnlocked, setOpenPanel } = useGame();
  const initials = user.handle ? user.handle.slice(0, 2).toUpperCase() : "NA";

  const nav: { id: PanelId; icon: LucideIcon; label: string }[] = [
    { id: "gallery", icon: Images, label: "Gallery" },
    {
      id: "payments",
      icon: paidUnlocked ? Wallet : Lock,
      label: paidUnlocked ? "Payments" : "Payments · unlocks at Level 5",
    },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-2 sm:top-4 sm:right-4">
      {/* Recenter — appears to the LEFT of the profile bar once you pan away. */}
      {showRecenter && onRecenter ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onRecenter}
              aria-label="Back to my location"
              className="inline-flex items-center gap-1.5 rounded-xl border bg-card/80 px-2.5 py-2 text-sm font-medium shadow-xl backdrop-blur-md transition-colors duration-200 animate-in fade-in slide-in-from-right-2 hover:bg-accent/60"
            >
              <LocateFixed className="size-4 text-primary" />
              <span className="hidden sm:inline">Recenter</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Back to my location</TooltipContent>
        </Tooltip>
      ) : null}

      <div className="flex items-center gap-1 rounded-xl border bg-card/80 p-1.5 shadow-xl backdrop-blur-md">
      {/* Level (opens profile) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpenPanel("profile")}
            className="flex items-center gap-2 rounded-lg py-0.5 pr-2 pl-1 transition-colors hover:bg-accent/60"
          >
            <LevelRing level={level.level} progress={level.progress} />
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-xs font-medium">Level {level.level}</span>
              <span className="tnum text-[10px] text-muted-foreground">
                {level.xpInto}/{level.xpSpan} XP
              </span>
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {level.nextUnlock ? `${level.xpToNext} XP to Level ${level.level + 1}` : "Top level reached"}
        </TooltipContent>
      </Tooltip>

      {/* Streak */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="hidden items-center gap-0.5 px-1.5 py-1 text-xs sm:inline-flex">
            <Flame className="size-3.5 text-primary" fill="currentColor" />
            <span className="tnum font-medium">
              {user.streak}
              <span className="text-muted-foreground">d</span>
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{user.streak}-day streak</TooltipContent>
      </Tooltip>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Quick-action dialogs */}
      {nav.map((n) => {
        const locked = n.id === "payments" && !paidUnlocked;
        return (
          <Tooltip key={n.id}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="relative" onClick={() => setOpenPanel(n.id)}>
                <n.icon className="size-4" />
                {locked ? (
                  <span className="absolute top-1 right-1 size-1.5 rounded-full bg-warning ring-2 ring-card" />
                ) : null}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{n.label}</TooltipContent>
          </Tooltip>
        );
      })}

      {/* Profile */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpenPanel("profile")}
            className="ml-0.5 transition-opacity hover:opacity-80"
          >
            <Avatar className="size-8 border">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </TooltipTrigger>
        <TooltipContent>Profile</TooltipContent>
      </Tooltip>
      </div>
    </div>
  );
}
