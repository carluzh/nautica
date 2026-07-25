"use client";

import { Check, Gauge, ShieldCheck, Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TIERS } from "@/lib/game/content";
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

/** Profile: the XP LEVEL ladder and the SEPARATE World ID verification tiers. */
export function ProfileDialog() {
  const { openPanel, setOpenPanel, user, level, gallery, leaderboard, verify } = useGame();

  const initials = user.handle ? user.handle.slice(0, 2).toUpperCase() : "NA";
  const rank = leaderboard.find((e) => e.you)?.rank ?? null;

  const unlockLevels = Object.keys(LEVEL_UNLOCKS)
    .map(Number)
    .sort((a, b) => a - b);
  const nextLockedLevel = unlockLevels.find((l) => level.level < l) ?? null;

  return (
    <Dialog open={openPanel === "profile"} onOpenChange={(o) => !o && setOpenPanel(null)}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogDescription className="sr-only">
          Your XP level progress and your separate World ID verification tiers.
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center gap-3 p-5 pr-12">
          <Avatar size="lg" className="border">
            <AvatarFallback className="text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base leading-tight">{user.handle || "Guest"}</DialogTitle>
            <p className="tnum truncate text-xs text-muted-foreground">{user.wallet || "Not connected"}</p>
          </div>
          <Badge variant="secondary" className="tnum shrink-0 gap-1">
            <Zap className="size-3 text-primary" />
            {level.totalXp} XP
          </Badge>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 divide-x divide-border border-y">
          <Stat label="Sightings" value={gallery.length} />
          <Stat label="Day streak" value={user.streak} />
          <Stat label="Rank" value={rank ? `#${rank}` : "Unranked"} />
        </div>

        <ScrollArea className="flex-1">
          {/* Section 1 - Level */}
          <section className="p-5">
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Level</h3>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="tnum text-3xl font-semibold leading-none">Level {level.level}</p>
              <div className="min-w-0 text-right">
                {level.nextUnlock ? (
                  <>
                    <p className="tnum text-sm">
                      <span className="font-semibold text-primary">{level.xpToNext}</span> XP to Level {level.level + 1}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">Next: {level.nextUnlock}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Top level reached</p>
                )}
              </div>
            </div>

            <div className="mt-3">
              <Progress value={level.progress * 100} className="h-2" />
              <div className="tnum mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Level {level.level}</span>
                <span>
                  {level.xpInto}/{level.xpSpan} XP
                </span>
                <span>Level {level.level + 1}</span>
              </div>
            </div>

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
          </section>

          {/* Section 2 - World ID verification (separate from level) */}
          <section className="border-t p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">World ID verification</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Verification is separate from your XP level. Your level comes from completing quests. These tiers prove you
              are a unique human and gate real payouts.
            </p>

            <ul className="mt-3 flex flex-col gap-2">
              {TIERS.map((tier) => {
                const done = user.verification[tier.step];
                return (
                  <li key={tier.step} className="flex items-center gap-3 rounded-lg border p-3">
                    <div
                      className="grid size-9 shrink-0 place-items-center rounded-lg border"
                      style={{ color: tier.color }}
                    >
                      <tier.icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <p className="text-sm font-medium">{tier.name}</p>
                        <span className="text-[11px] text-muted-foreground">{tier.method}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">Unlocks: {tier.unlocks}</p>
                    </div>
                    {done ? (
                      <Badge variant="outline" className="shrink-0 gap-1 border-success/30 text-success">
                        <Check className="size-3" /> Verified
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="shrink-0"
                        onClick={() => verify(tier.step)}
                      >
                        Verify
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
