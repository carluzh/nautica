"use client";

import { Check, Wallet, Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LevelRing } from "@/components/app/level-ring";
import { LEVEL_UNLOCKS } from "@/lib/game/levels";
import { useGame } from "@/lib/game/provider";
import { cn } from "@/lib/utils";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-3 py-3 text-center">
      <p className="tnum text-lg font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

/** Level: XP total, quick stats, and the level ladder with per-level unlocks. */
export function LevelDialog() {
  const { openPanel, setOpenPanel, user, level, gallery, leaderboard } = useGame();

  const initials = user.handle ? user.handle.slice(0, 2).toUpperCase() : "NA";
  const rank = leaderboard.find((e) => e.you)?.rank ?? null;

  const unlockLevels = Object.keys(LEVEL_UNLOCKS)
    .map(Number)
    .sort((a, b) => a - b);
  const nextLockedLevel = unlockLevels.find((l) => level.level < l) ?? null;

  return (
    <Dialog open={openPanel === "level"} onOpenChange={(o) => !o && setOpenPanel(null)}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogDescription className="sr-only">
          Your XP total, quick stats, and the level ladder with its unlocks.
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center gap-3 p-5 pr-12">
          <Avatar size="lg" className="border">
            <AvatarFallback className="text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base leading-tight">{user.handle || "Guest"}</DialogTitle>
            <p className="tnum flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Wallet className="size-3 shrink-0" />
              {user.wallet ? user.wallet : "No on-chain address yet"}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Zap className="size-4 text-primary" fill="currentColor" />
            <span className="tnum text-sm font-medium">{level.totalXp} XP</span>
          </span>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 divide-x divide-border border-y">
          <Stat label="Sightings" value={gallery.length} />
          <Stat label="Day streak" value={user.streak} />
          <Stat label="Rank" value={rank ? `#${rank}` : "Unranked"} />
        </div>

        <ScrollArea className="flex-1">
          <section className="p-5">
            {/* Level: one big progress ring (the number is inside it) with the
                remaining XP and next unlock beside it - no repeated "Level X". */}
            <div className="flex items-center gap-4 rounded-xl border bg-card/50 p-4">
              <LevelRing level={level.level} progress={level.progress} size={64} />
              <div className="min-w-0 flex-1">
                {level.nextUnlock ? (
                  <>
                    <p className="text-sm">
                      <span className="tnum font-semibold text-primary">{level.xpToNext}</span> XP to Level{" "}
                      {level.level + 1}
                    </p>
                    <p className="tnum mt-0.5 text-[11px] text-muted-foreground">
                      {level.xpInto}/{level.xpSpan} XP this level
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">Next up: {level.nextUnlock}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Top level reached</p>
                )}
              </div>
            </div>

            {/* Unlocks ladder. */}
            {nextLockedLevel !== null ? (
              <>
                <p className="mt-5 mb-2 text-xs font-medium text-muted-foreground">Unlocks</p>
                <ul className="flex flex-col gap-1.5">
                  {unlockLevels.map((lvl) => {
                    const unlocked = level.level >= lvl;
                    const isNext = lvl === nextLockedLevel;
                    return (
                      <li
                        key={lvl}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-3 py-2",
                          isNext ? "border-primary/40 bg-primary/5" : "border-transparent",
                        )}
                      >
                        <div
                          className={cn(
                            "tnum grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                            unlocked ? "bg-primary/15 text-primary" : "border bg-muted/40 text-muted-foreground",
                          )}
                        >
                          {unlocked ? <Check className="size-3.5" /> : lvl}
                        </div>
                        <p className={cn("min-w-0 flex-1 truncate text-sm", !unlocked && "text-muted-foreground")}>
                          {LEVEL_UNLOCKS[lvl]}
                        </p>
                        {unlocked ? (
                          <span className="shrink-0 text-[10px] font-medium text-success">Unlocked</span>
                        ) : isNext ? (
                          <Badge variant="outline" className="shrink-0 border-primary/40 text-[10px] text-primary">
                            Next
                          </Badge>
                        ) : (
                          <span className="tnum shrink-0 text-[10px] text-muted-foreground">Level {lvl}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : null}
          </section>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
