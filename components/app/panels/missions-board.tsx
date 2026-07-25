"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Circle,
  Compass,
  Flame,
  Loader2,
  Lock,
  Plus,
  Timer,
  Wallet,
} from "lucide-react";
import { PartnerQuestDialog } from "@/components/app/panels/partner-quest-dialog";
import { SpeciesBadge } from "@/components/app/species-badge";
import { PAID_UNLOCK_LEVEL, xpForLevel } from "@/lib/game/levels";
import { useGame } from "@/lib/game/provider";
import type { Quest } from "@/lib/game/types";
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

/** The reward chip on the right of a quest row: shows the amount by default and
 *  cross-fades to "Log" (white) on row hover. `xp` = coral, `usd` = green. The two
 *  labels are grid-stacked so the swap fades smoothly instead of jumping. */
function LogPill({ amount, tone }: { amount: string; tone: "xp" | "usd" }) {
  return (
    <span
      className={cn(
        "tnum relative inline-grid shrink-0 place-items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-200",
        tone === "xp" ? "bg-primary/10 group-hover:bg-primary" : "bg-success/15 group-hover:bg-success",
      )}
    >
      <span
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-200 group-hover:opacity-0",
          tone === "xp" ? "text-primary" : "text-success",
        )}
      >
        {amount}
      </span>
      <span className="col-start-1 row-start-1 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        Log
      </span>
    </span>
  );
}

/** Bottom-right floating glass panel: the daily quest board. */
export function MissionsBoard() {
  const { quests, paidUnlocked, openQuest, user, level } = useGame();

  // Mount-gated so the live clock never mismatches the server render.
  const [reset, setReset] = useState<string>("··");
  const [postOpen, setPostOpen] = useState(false);
  useEffect(() => {
    const tick = () => setReset(fmtCountdown(msToMidnight(Date.now())));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  const free = quests.filter((q) => q.kind === "free");
  const paid = quests.filter((q) => q.kind === "paid");
  const xpToUnlock = Math.max(0, xpForLevel(PAID_UNLOCK_LEVEL) - level.totalXp);

  return (
    <div className="pointer-events-auto absolute right-3 bottom-3 z-10 w-[min(94vw,440px)] sm:right-4 sm:bottom-4">
      <div className="flex max-h-[min(76svh,640px)] flex-col overflow-hidden rounded-xl border bg-card/80 shadow-xl backdrop-blur-md">
        {/* header: coral band (tight dot-grid texture) with the title + streak. */}
        <div
          className="flex shrink-0 items-center justify-between gap-2 bg-primary px-3 py-2.5"
          style={{
            backgroundImage: "radial-gradient(rgba(0,0,0,0.13) 1px, transparent 1.2px)",
            backgroundSize: "7px 7px",
          }}
        >
          <span className="text-sm font-semibold text-black/90">Daily quests</span>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-black">
            <Flame className="size-4" fill="currentColor" />
            <span className="tnum text-sm font-medium">{user.streak}d</span>
          </span>
        </div>

        {/* quest list */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {quests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Compass className="size-8 text-muted-foreground/60" />
              <p className="text-sm font-medium">No quests right now</p>
              <p className="text-[11px] text-muted-foreground">
                New research quests appear here as partners fund them.
              </p>
            </div>
          ) : (
            <>
              {free.map((q) => (
                <FreeRow key={q.id} quest={q} onStart={() => openQuest(q.id)} />
              ))}
              {paid.map((q) => (
                <PaidRow
                  key={q.id}
                  quest={q}
                  unlocked={paidUnlocked}
                  hasWallet={Boolean(user.wallet)}
                  xpToUnlock={xpToUnlock}
                  onStart={() => openQuest(q.id)}
                />
              ))}
            </>
          )}
        </div>

        {/* footer: post a quest (left) + refresh countdown (right) */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-3 py-2 text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={() => setPostOpen(true)}
            className="inline-flex items-center gap-1 rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="size-3" /> Post a research quest
          </button>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Timer className="size-3 shrink-0" /> Refresh in <span className="tnum">{reset}</span>
          </span>
        </div>
      </div>
      <PartnerQuestDialog open={postOpen} onOpenChange={setPostOpen} />
    </div>
  );
}

function IconTile({ quest, muted }: { quest: Quest; muted?: boolean }) {
  return <SpeciesBadge species={quest.species} className={cn("size-9", muted && "opacity-40 grayscale")} />;
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
      <Loader2 className="size-3.5 animate-spin" /> Checking
    </span>
  ) : notLive ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground">
      <Lock className="size-3" /> Not yet live
    </span>
  ) : (
    <LogPill amount={`+${quest.reward} XP`} tone="xp" />
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
          {quest.title}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{quest.spec}</p>
      </div>
      {right}
    </ClickableRow>
  );
}

function PaidRow({
  quest,
  unlocked,
  hasWallet,
  xpToUnlock,
  onStart,
}: {
  quest: Quest;
  unlocked: boolean;
  hasWallet: boolean;
  xpToUnlock: number;
  onStart: () => void;
}) {
  const done = quest.status === "done";
  const verifying = quest.status === "verifying";
  const notLive = quest.onchain === false;
  const dry = quest.underfunded === true;

  // Locked: below Level 5. Tease the reward, name the gate.
  if (!unlocked) {
    return (
      <div className="flex items-center gap-3 border-t bg-muted/30 px-3 py-3">
        <div className="relative shrink-0">
          <SpeciesBadge species={quest.species} className="size-9 opacity-40 grayscale" />
          <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border bg-card text-muted-foreground">
            <Lock className="size-2.5" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-muted-foreground">Paid research quest</p>
          <p className="text-[11px] text-muted-foreground">
            Unlocks at Level {PAID_UNLOCK_LEVEL}
            {xpToUnlock > 0 ? (
              <>
                {" · "}
                <span className="tnum">{xpToUnlock} XP</span> to go
              </>
            ) : null}
          </p>
        </div>
        <span className="tnum shrink-0 text-sm font-semibold text-muted-foreground">${quest.usdc}</span>
      </div>
    );
  }

  // Unlocked + already completed.
  if (done) {
    return (
      <div className="flex items-center gap-3 border-t bg-primary/5 px-3 py-3 opacity-70">
        <IconTile quest={quest} muted />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{quest.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{quest.partner}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="tnum text-sm font-semibold text-success">${quest.usdc}</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-success">
            <Check className="size-3" /> Paid
          </span>
        </div>
      </div>
    );
  }

  // Unlocked + available: same clickable row as the free quests, green money chip.
  const clickable = !verifying && !notLive && !dry;
  const right = verifying ? (
    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" /> Checking
    </span>
  ) : notLive ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground">
      <Lock className="size-3" /> Not yet live
    </span>
  ) : dry ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-warning/30 px-1.5 py-0.5 text-[11px] text-warning">
      Escrow low
    </span>
  ) : (
    <LogPill amount={`$${quest.usdc}`} tone="usd" />
  );

  return (
    <ClickableRow
      clickable={clickable}
      onStart={onStart}
      className={cn(
        "group flex flex-col gap-2.5 border-t bg-primary/5 px-3 py-3",
        clickable && "hover:bg-primary/10",
      )}
    >
      <div className="flex items-center gap-3">
        <SpeciesBadge species={quest.species} className="size-9" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">{quest.title}</p>
            <span className="inline-flex shrink-0 items-center rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
              Paid
            </span>
          </div>
          <p className="truncate text-[11px] text-muted-foreground">{quest.partner}</p>
        </div>
        {right}
      </div>

      {quest.requirements?.length ? (
        <div className="flex flex-wrap gap-1">
          {quest.requirements.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 rounded-md border bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              <Circle className="size-2 text-primary/70" /> {r}
            </span>
          ))}
        </div>
      ) : null}

      {!hasWallet ? (
        <div className="inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] text-warning">
          <Wallet className="size-3.5 shrink-0" /> Connect a wallet to earn USDC
        </div>
      ) : null}
    </ClickableRow>
  );
}
