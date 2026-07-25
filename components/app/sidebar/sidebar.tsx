"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Gauge, SlidersHorizontal, Trophy, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TabActivities } from "./tab-activities";
import { TabFilter } from "./tab-filter";
import { TabStats } from "./tab-stats";
import { TabLeaderboard } from "./tab-leaderboard";
import type { FilterState } from "./types";

type TabId = "filter" | "activities" | "stats" | "leaderboard";

const TABS: { id: TabId; icon: LucideIcon; label: string }[] = [
  { id: "filter", icon: SlidersHorizontal, label: "Filter" },
  { id: "activities", icon: Activity, label: "Activities" },
  { id: "stats", icon: Gauge, label: "Stats" },
  { id: "leaderboard", icon: Trophy, label: "Leaderboard" },
];

/**
 * The left column: logo, a 4-category tab row, and the active category's content
 * below. Activities is the default. The level / streak / quick-actions / profile
 * HUD floats top-right over the map instead (see map-hud). Rendered as a fixed
 * column on lg+ and inside a slide-in overlay on smaller screens (see game-hub).
 */
export function Sidebar({
  filter,
  onClose,
  className,
}: {
  filter: FilterState;
  onClose?: () => void;
  className?: string;
}) {
  const [tab, setTab] = useState<TabId>("activities");

  return (
    <aside className={cn("flex h-full w-full flex-col bg-card", className)}>
      {/* Header: logo */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3.5">
        <Link
          href="/"
          className="inline-flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          {/* Brand mark (public/logo.png) tinted coral via CSS mask — logo.png
              carries alpha, so only the mark itself takes the fill. */}
          <span
            role="img"
            aria-label="nautica"
            className="size-7 shrink-0"
            style={{
              backgroundColor: "#FF6F61",
              maskImage: "url(/logo.png)",
              WebkitMaskImage: "url(/logo.png)",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
          />
          <span className="relative top-[-2px] truncate text-xl font-bold tracking-tight">nautica</span>
        </Link>
        {onClose ? (
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="shrink-0 lg:hidden">
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      {/* Category tabs */}
      <div className="grid grid-cols-4 gap-1 border-b p-2">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-pressed={active}
              className={cn(
                "flex items-center justify-center gap-1.5 min-w-0 rounded-lg px-1 py-2 text-[11px] font-semibold transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <t.icon className="size-4 shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active category content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "filter" ? <TabFilter filter={filter} /> : null}
        {tab === "activities" ? <TabActivities /> : null}
        {tab === "stats" ? <TabStats /> : null}
        {tab === "leaderboard" ? <TabLeaderboard /> : null}
      </div>
    </aside>
  );
}
