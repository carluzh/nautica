"use client";

import { Crown, Trophy } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGame } from "@/lib/game/provider";
import { cn } from "@/lib/utils";

/** The Graph-powered ranked leaderboard. Data is illustrative in the skeleton. */
export function LeaderboardDialog() {
  const { openPanel, setOpenPanel, leaderboard } = useGame();

  return (
    <Dialog open={openPanel === "leaderboard"} onOpenChange={(o) => !o && setOpenPanel(null)}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 border-b p-5 pr-12">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <Trophy className="size-5" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base leading-tight">Leaderboard</DialogTitle>
            <DialogDescription className="text-xs">Top contributors this season</DialogDescription>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <ul className="flex flex-col gap-0.5 p-2">
            {leaderboard.map((e) => {
              const initials = e.handle.slice(0, 2).toUpperCase();
              return (
                <li
                  key={e.rank}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2",
                    e.you ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : "hover:bg-muted/40",
                  )}
                >
                  <div
                    className={cn(
                      "tnum grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                      e.rank === 1
                        ? "bg-warning/20 text-warning"
                        : e.rank === 2
                          ? "bg-muted text-foreground"
                          : e.rank === 3
                            ? "bg-warning/10 text-warning/80"
                            : "text-muted-foreground",
                    )}
                  >
                    {e.rank === 1 ? <Crown className="size-3.5" /> : e.rank}
                  </div>

                  <Avatar size="sm" className="border">
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.handle}
                      {e.you && <span className="ml-1 text-xs font-normal text-primary">(you)</span>}
                    </p>
                  </div>

                  <Badge variant="secondary" className="tnum shrink-0">
                    L{e.level}
                  </Badge>
                  <span className="tnum w-20 shrink-0 text-right text-sm font-semibold">
                    {e.xp.toLocaleString()}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">XP</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </ScrollArea>

        <div className="border-t px-5 py-3 text-center text-[11px] text-muted-foreground">
          Indexed live by The Graph · illustrative
        </div>
      </DialogContent>
    </Dialog>
  );
}
