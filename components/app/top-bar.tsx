"use client";

import { Flame, Images, Lock, Settings, Trophy, Wallet, type LucideIcon } from "lucide-react";
import { NauticaLogo } from "@/components/brand/nautica-logo";
import { Wordmark } from "@/components/brand/wordmark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGame } from "@/lib/game/provider";
import type { PanelId } from "@/lib/game/types";

/** Compact XP ring with the current level centered inside it. */
function LevelRing({ level, progress }: { level: number; progress: number }) {
  const R = 15.5;
  const C = 2 * Math.PI * R;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <span className="relative grid size-9 shrink-0 place-items-center">
      <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
        <circle cx="18" cy="18" r={R} fill="none" strokeWidth={3} className="stroke-primary/15" />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - clamped)}
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="tnum absolute text-[11px] font-semibold leading-none">{level}</span>
    </span>
  );
}

/** Top HUD strip over the map. Wrapper is click-through; each cluster opts back in. */
export function TopBar() {
  const { user, level, paidUnlocked, setOpenPanel } = useGame();
  const initials = user.handle ? user.handle.slice(0, 2).toUpperCase() : "NA";

  const nav: { id: PanelId; icon: LucideIcon; label: string }[] = [
    { id: "leaderboard", icon: Trophy, label: "Leaderboard" },
    { id: "gallery", icon: Images, label: "Gallery" },
    {
      id: "payments",
      icon: paidUnlocked ? Wallet : Lock,
      label: paidUnlocked ? "Payments" : "Payments · unlocks at Level 5",
    },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-3 sm:p-4">
      <div className="pointer-events-auto rounded-xl border bg-card/80 px-3 py-2 shadow-xl backdrop-blur-md">
        {/* Compact mark on phones, full wordmark on sm+ so the HUD never overflows. */}
        <span className="hidden sm:inline-flex">
          <Wordmark href="/" size={22} />
        </span>
        <NauticaLogo size={22} className="sm:hidden" />
      </div>

      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border bg-card/80 p-1.5 shadow-xl backdrop-blur-md">
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

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="hidden items-center gap-1 rounded-lg bg-secondary px-2 py-1.5 text-xs sm:inline-flex">
              <Flame className="size-3.5 text-warning" />
              <span className="tnum font-medium">{user.streak}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{user.streak}-day streak</TooltipContent>
        </Tooltip>

        <div className="mx-0.5 h-6 w-px bg-border" />

        {nav.map((n) => {
          const locked = n.id === "payments" && !paidUnlocked;
          return (
            <Tooltip key={n.id}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="relative" onClick={() => setOpenPanel(n.id)}>
                  <n.icon className="size-4" />
                  {locked && (
                    <span className="absolute top-1 right-1 size-1.5 rounded-full bg-warning ring-2 ring-card" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{n.label}</TooltipContent>
            </Tooltip>
          );
        })}

        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => setOpenPanel("profile")} className="ml-0.5 transition-opacity hover:opacity-80">
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
