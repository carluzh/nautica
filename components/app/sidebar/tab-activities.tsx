"use client";

import type { LucideIcon } from "lucide-react";
import { Flag, ShieldCheck, Sparkles } from "lucide-react";
import { AttestationBadge } from "@/components/app/attestation";
import { SpeciesBadge } from "@/components/app/species-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGame } from "@/lib/game/provider";
import { timeAgo } from "@/lib/format";
import type { ActivityEvent } from "@/lib/game/types";
import { cn } from "@/lib/utils";

// Non-species kinds only; species rows use SpeciesBadge to match the map.
const KIND_ICON: Record<string, { Icon: LucideIcon; tint: string }> = {
  levelup: { Icon: Sparkles, tint: "text-warning" },
  verify: { Icon: ShieldCheck, tint: "text-success" },
  join: { Icon: Flag, tint: "text-muted-foreground" },
};

function Row({ e }: { e: ActivityEvent }) {
  const { focusSighting } = useGame();
  const entry = KIND_ICON[e.kind];
  const KindIcon: LucideIcon = entry?.Icon ?? Sparkles;

  // Only sightings with coords can be focused (flies the map + opens the popup).
  const focusable = e.lng != null && e.lat != null && e.species != null;
  const focus = focusable
    ? () => focusSighting({ lng: e.lng!, lat: e.lat!, species: e.species!, title: e.title })
    : undefined;

  return (
    <li
      role={focusable ? "button" : undefined}
      tabIndex={focusable ? 0 : undefined}
      onClick={focus}
      onKeyDown={
        focusable
          ? (ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                focus?.();
              }
            }
          : undefined
      }
      className={cn(
        "flex gap-2.5 border-b px-3 py-2.5 last:border-0",
        focusable && "cursor-pointer hover:bg-muted/40",
      )}
    >
      {e.species ? (
        <SpeciesBadge species={e.species} className="mt-0.5 size-7 rounded-lg" iconClassName="size-3.5" />
      ) : (
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border bg-background">
          <KindIcon className={cn("size-3.5", entry?.tint ?? "text-muted-foreground")} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm leading-snug font-medium">{e.title}</p>
          <div className="flex shrink-0 flex-col items-end leading-tight">
            {e.xp ? <span className="tnum text-xs font-medium text-primary">+{e.xp}</span> : null}
          </div>
        </div>

        {e.detail ? <p className="truncate text-xs text-muted-foreground">{e.detail}</p> : null}

        <div className="mt-1 flex items-center gap-2">
          {e.attestation ? (
            <AttestationBadge attestation={e.attestation} className="h-4 gap-1 px-1.5 text-[10px]" />
          ) : null}
          <span className="tnum text-[11px] text-muted-foreground">{timeAgo(e.at)}</span>
        </div>
      </div>
    </li>
  );
}

/** Default sidebar tab: the live sightings feed. */
export function TabActivities() {
  const { history } = useGame();
  // Quest-kind events are the logged sightings.
  const sightings = history.filter((e) => e.kind === "quest");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>Sightings</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-success" />
          </span>
          Live
        </span>
      </div>

      {sightings.length === 0 ? (
        <p className="px-3 py-8 text-center text-xs text-muted-foreground">
          No sightings yet. Complete a daily quest to log one.
        </p>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <ul className="flex flex-col">
            {sightings.map((e) => (
              <Row key={e.id} e={e} />
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
