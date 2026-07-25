"use client";

import { Crown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGame } from "@/lib/game/provider";
import { cn } from "@/lib/utils";

/** Leaderboard tab: The Graph-powered ranking. Data is illustrative in the skeleton. */
export function TabLeaderboard() {
  const { leaderboard } = useGame();

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
        Top divers this season
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex flex-col gap-0.5 p-2">
          {leaderboard.map((e) => {
            const initials = e.handle.slice(0, 2).toUpperCase();
            return (
              <li
                key={e.rank}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
                  e.you ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : "hover:bg-muted/40",
                )}
              >
                <div
                  className={cn(
                    "tnum grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
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
                <span className="tnum w-12 shrink-0 text-right text-xs font-semibold text-success">
                  +${(e.earnings ?? 0).toLocaleString()}
                </span>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </div>
  );
}
