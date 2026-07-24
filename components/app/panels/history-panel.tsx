"use client";

import type { LucideIcon } from "lucide-react";
import { Coins, Flag, History, ShieldCheck, Sparkles } from "lucide-react";
import { AttestationBadge } from "@/components/app/attestation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SPECIES_META } from "@/lib/game/content";
import { useGame } from "@/lib/game/provider";
import type { ActivityEvent } from "@/lib/game/types";
import { cn } from "@/lib/utils";

/** Compact "x min/h/d ago" from an epoch-ms timestamp vs now. Rendered only after
 *  the client-side World ID connect seeds history, so Date.now() is hydration-safe. */
function timeAgo(at: number): string {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.round(d / 7)}w ago`;
}

// Icon + token tint for the non-quest activity kinds. Quest rows use the species
// icon tinted with the species marker color so the feed echoes the map.
const KIND_ICON: Record<string, { Icon: LucideIcon; tint: string }> = {
  levelup: { Icon: Sparkles, tint: "text-warning" },
  verify: { Icon: ShieldCheck, tint: "text-success" },
  payout: { Icon: Coins, tint: "text-success" },
  join: { Icon: Flag, tint: "text-muted-foreground" },
};

function Row({ e }: { e: ActivityEvent }) {
  const speciesMeta = e.species ? SPECIES_META[e.species] : null;
  const entry = KIND_ICON[e.kind];
  const Icon: LucideIcon = speciesMeta?.icon ?? entry?.Icon ?? Sparkles;

  return (
    <li className="flex gap-2.5 border-b px-3 py-2.5 last:border-0">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border bg-background">
        <Icon
          className={cn("size-3.5", speciesMeta ? "" : entry?.tint ?? "text-muted-foreground")}
          style={speciesMeta ? { color: speciesMeta.color } : undefined}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm leading-snug font-medium">{e.title}</p>
          <div className="flex shrink-0 flex-col items-end leading-tight">
            {e.xp ? <span className="tnum text-xs font-medium text-primary">+{e.xp}</span> : null}
            {e.usdc ? <span className="tnum text-xs font-medium text-success">${e.usdc}</span> : null}
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

export function HistoryPanel() {
  const { history } = useGame();

  return (
    <div className="pointer-events-auto absolute top-20 left-3 z-10 hidden w-[300px] sm:top-24 sm:left-4 lg:block">
      <div className="flex max-h-[calc(100svh-8rem)] flex-col overflow-hidden rounded-xl border bg-card/80 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2 border-b px-3 py-2.5 text-sm font-medium">
          <History className="size-4 text-muted-foreground" />
          Activity
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            Live
          </span>
        </div>

        {history.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">No activity yet.</p>
        ) : (
          <ScrollArea className="flex-1">
            <ul className="flex flex-col">
              {history.map((e) => (
                <Row key={e.id} e={e} />
              ))}
            </ul>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
