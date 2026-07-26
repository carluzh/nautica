"use client";

import { Flame, Images, Settings, type LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGame } from "@/lib/game/provider";
import type { PanelId } from "@/lib/game/types";
import { LevelRing } from "./level-ring";

// Floating top-right HUD over the map. The logo and category tabs live in the
// left sidebar, not here.
export function MapHud() {
  const { user, level, setOpenPanel } = useGame();
  const initials = user.handle ? user.handle.slice(0, 2).toUpperCase() : "NA";

  const nav: { id: PanelId; icon: LucideIcon; label: string }[] = [
    { id: "gallery", icon: Images, label: "Gallery" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-xl border bg-card/80 p-1.5 shadow-xl backdrop-blur-md sm:top-4 sm:right-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpenPanel("level")}
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

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="hidden items-center gap-0.5 px-1.5 py-1 text-xs sm:inline-flex">
            <Flame className="size-3.5 text-primary" fill="currentColor" />
            <span className="tnum font-medium">{user.streak}d</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{user.streak}-day streak</TooltipContent>
      </Tooltip>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {nav.map((n) => (
        <Tooltip key={n.id}>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="relative" onClick={() => setOpenPanel(n.id)}>
              <n.icon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{n.label}</TooltipContent>
        </Tooltip>
      ))}

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
  );
}
