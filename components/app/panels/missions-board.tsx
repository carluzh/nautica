"use client";

import { useEffect, useState } from "react";
import { Building2, Check, ChevronDown, Compass, Flame, Loader2, Lock, Plus, Timer } from "lucide-react";
import { toast } from "sonner";
import { AddLogDialog } from "@/components/app/panels/add-log-dialog";
import { SpeciesBadge } from "@/components/app/species-badge";
import { useGame } from "@/lib/game/provider";
import type { Quest, SpeciesId } from "@/lib/game/types";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ---- countdown to the next local midnight (daily quest reset) ----------------
function msToMidnight(now: number): number {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now;
}
function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** The reward chip on the right of a quest row: shows the XP by default and
 *  cross-fades to "Log" (white) on row hover. The two labels are grid-stacked so
 *  the swap fades smoothly instead of jumping. */
function LogPill({ amount }: { amount: string }) {
  const t = useT();
  return (
    <span className="tnum relative inline-grid shrink-0 place-items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold transition-colors duration-200 group-hover:bg-primary">
      <span className="col-start-1 row-start-1 text-primary transition-opacity duration-200 group-hover:opacity-0">
        {amount}
      </span>
      <span className="col-start-1 row-start-1 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {t("Log")}
      </span>
    </span>
  );
}

/** Bottom-right floating glass panel: the daily quest board. */
export function MissionsBoard() {
  const { quests, openQuest, user } = useGame();
  const t = useT();

  // Mount-gated so the live clock never mismatches the server render.
  const [reset, setReset] = useState<string>("··");
  const [logOpen, setLogOpen] = useState(false);
  // Foldable so players can collapse the board to see more of the map. Persisted.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(window.localStorage.getItem("nautica.quests.collapsed") === "1");
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const next = !v;
      window.localStorage.setItem("nautica.quests.collapsed", next ? "1" : "0");
      return next;
    });
  useEffect(() => {
    const tick = () => setReset(fmtCountdown(msToMidnight(Date.now())));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="pointer-events-auto absolute right-3 bottom-3 z-10 w-[min(94vw,440px)] sm:right-4 sm:bottom-4">
      <div className="flex max-h-[min(76svh,640px)] flex-col overflow-hidden rounded-xl border bg-card/80 shadow-xl backdrop-blur-md">
        {/* header: coral band (tight dot-grid texture); tap to fold/unfold the board. */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          className="flex shrink-0 items-center justify-between gap-2 bg-primary px-3 py-2.5 text-left transition-[filter] hover:brightness-[1.03]"
          style={{
            backgroundImage: "radial-gradient(rgba(0,0,0,0.13) 1px, transparent 1.2px)",
            backgroundSize: "7px 7px",
          }}
        >
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-black/90">
            <ChevronDown
              className={cn("size-4 transition-transform duration-200", collapsed && "-rotate-90")}
            />
            {t("Daily quests")}
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-black">
            <Flame className="size-4" fill="currentColor" />
            <span className="tnum text-sm font-medium">{user.streak}d</span>
          </span>
        </button>

        {!collapsed && (
          <>
            {/* quest list */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {quests.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <Compass className="size-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">{t("No quests right now")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("New research quests appear here as they go live.")}
                  </p>
                </div>
              ) : (
                quests.map((q) => <FreeRow key={q.id} quest={q} onStart={() => openQuest(q.id)} />)
              )}
              <PaidPreviewRow />
            </div>

            {/* footer: add a sighting (left) + refresh countdown (right) */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-t px-3 py-2 text-[11px] text-muted-foreground">
              <button
                type="button"
                onClick={() => setLogOpen(true)}
                className="inline-flex items-center gap-1 rounded text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="size-3" /> {t("Add a sighting")}
              </button>
              <span className="inline-flex shrink-0 items-center gap-1">
                <Timer className="size-3 shrink-0" /> {t("Refresh in")}{" "}
                <span className="tnum">{reset}</span>
              </span>
            </div>
          </>
        )}
      </div>
      <AddLogDialog open={logOpen} onOpenChange={setLogOpen} />
    </div>
  );
}

function IconTile({ quest, muted }: { quest: Quest; muted?: boolean }) {
  return <SpeciesBadge species={quest.species} className={cn("size-9", muted && "opacity-40 grayscale")} />;
}

/** A mocked, non-functional preview of a partner-funded paid quest: it advertises the
 *  paid tier (partner + USDC) without any real payout wiring; tapping just explains it. */
function PaidPreviewRow() {
  const t = useT();
  return (
    <ClickableRow
      clickable
      onStart={() =>
        toast(t("Partner-funded quests are coming soon"), {
          description: t(
            "Research partners will fund quests that pay USDC on Base for verified sightings.",
          ),
        })
      }
      className="group flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/40"
    >
      <SpeciesBadge species={"Lionfish" as SpeciesId} className="size-9" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium">{t("Lionfish removal survey")}</p>
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-px text-[9px] font-semibold text-primary">
            <Building2 className="size-2.5" /> {t("Partner")}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {t("MARE · Marine Sciences Institute · preview")}
        </p>
      </div>
      <span className="tnum inline-flex shrink-0 items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-xs font-semibold text-success">
        $6 · 40 XP
      </span>
    </ClickableRow>
  );
}

/** Row wrapper that is clickable (role=button) when the quest can be started. */
function ClickableRow({
  clickable,
  onStart,
  className,
  children,
}: {
  clickable: boolean;
  onStart: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  if (!clickable) return <div className={className}>{children}</div>;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onStart}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStart();
        }
      }}
      className={cn("cursor-pointer transition-colors", className)}
    >
      {children}
    </div>
  );
}

function FreeRow({ quest, onStart }: { quest: Quest; onStart: () => void }) {
  const t = useT();
  const done = quest.status === "done";
  const verifying = quest.status === "verifying";
  const notLive = quest.onchain === false;
  const clickable = !done && !verifying && !notLive;

  const right = done ? (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
      <Check className="size-4" />
    </span>
  ) : verifying ? (
    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" /> {t("Checking")}
    </span>
  ) : notLive ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground">
      <Lock className="size-3" /> {t("Not yet live")}
    </span>
  ) : (
    <LogPill amount={`+${quest.reward} XP`} />
  );

  return (
    <ClickableRow
      clickable={clickable}
      onStart={onStart}
      className={cn(
        "group flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0",
        clickable && "hover:bg-muted/40",
        done && "opacity-60",
      )}
    >
      <IconTile quest={quest} muted={done} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", done && "text-muted-foreground")}>
          {t(quest.title)}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{t(quest.spec)}</p>
      </div>
      {right}
    </ClickableRow>
  );
}
