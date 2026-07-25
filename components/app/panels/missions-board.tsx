"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Circle,
  Coins,
  Flame,
  IdCard,
  Loader2,
  Lock,
  Sparkles,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

/** Bottom-right floating glass panel: the daily quest board. */
export function MissionsBoard() {
  const { quests, paidUnlocked, openQuest, user, level } = useGame();

  // Mount-gated so the live clock never mismatches the server render.
  const [reset, setReset] = useState<string>("··");
  useEffect(() => {
    const tick = () => setReset(fmtCountdown(msToMidnight(Date.now())));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);

  const free = quests.filter((q) => q.kind === "free");
  const paid = quests.find((q) => q.kind === "paid");
  const done = quests.filter((q) => q.status === "done").length;
  const xpToUnlock = Math.max(0, xpForLevel(PAID_UNLOCK_LEVEL) - level.totalXp);

  return (
    <div className="pointer-events-auto absolute right-3 bottom-3 z-10 w-[min(92vw,360px)] sm:right-4 sm:bottom-4">
      <div className="flex max-h-[min(76svh,640px)] flex-col overflow-hidden rounded-xl border bg-card/80 shadow-xl backdrop-blur-md">
        {/* header: title + reset countdown + streak */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5">
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium leading-tight">Daily quests</span>
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Timer className="size-3 shrink-0" />
              Resets in <span className="tnum">{reset}</span>
            </span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-xs">
            <Flame className="size-3.5 text-warning" />
            <span className="tnum font-medium">{user.streak}</span>
            <span className="text-muted-foreground">day</span>
          </span>
        </div>

        {/* quest list */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {free.map((q) => (
            <FreeRow key={q.id} quest={q} onStart={() => openQuest(q.id)} />
          ))}
          {paid ? (
            <PaidRow
              quest={paid}
              unlocked={paidUnlocked}
              hasPassport={user.verification.passport}
              xpToUnlock={xpToUnlock}
              onStart={() => openQuest(paid.id)}
            />
          ) : null}
        </div>

        {/* footer summary */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-3 py-2 text-[11px] text-muted-foreground">
          <span className="truncate">0G-verified · open dataset</span>
          <span className="tnum shrink-0">
            {done}/{quests.length}
          </span>
        </div>
      </div>
    </div>
  );
}

function IconTile({ quest, muted }: { quest: Quest; muted?: boolean }) {
  return <SpeciesBadge species={quest.species} className={cn("size-9", muted && "opacity-40 grayscale")} />;
}

function FreeRow({ quest, onStart }: { quest: Quest; onStart: () => void }) {
  const done = quest.status === "done";
  const verifying = quest.status === "verifying";

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0",
        done && "opacity-60",
      )}
    >
      <IconTile quest={quest} muted={done} />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", done && "text-muted-foreground")}>
          {quest.title}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="tnum inline-flex shrink-0 items-center rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
            +{quest.reward} XP
          </span>
          <p className="truncate text-[11px] text-muted-foreground">{quest.spec}</p>
        </div>
      </div>
      {done ? (
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-4" />
        </span>
      ) : verifying ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Checking
        </span>
      ) : (
        <Button size="sm" variant="secondary" className="shrink-0" onClick={onStart}>
          Start
        </Button>
      )}
    </div>
  );
}

function PaidRow({
  quest,
  unlocked,
  hasPassport,
  xpToUnlock,
  onStart,
}: {
  quest: Quest;
  unlocked: boolean;
  hasPassport: boolean;
  xpToUnlock: number;
  onStart: () => void;
}) {
  const done = quest.status === "done";
  const verifying = quest.status === "verifying";

  // Locked: below Level 5. Tease the reward, name the gate.
  if (!unlocked) {
    return (
      <div className="flex flex-col gap-2 border-t bg-muted/30 px-3 py-3">
        <div className="flex items-center gap-3">
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
          <span className="tnum inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] text-muted-foreground">
            <Coins className="size-3" />${quest.usdc}
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md bg-background/60 px-2 py-1 text-[11px] text-muted-foreground">
          <IdCard className="size-3.5 shrink-0" />
          Needs World ID Passport verification to earn USDC
        </div>
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

  // Unlocked + available: partner, reward, requirement chips, Start.
  return (
    <div className="flex flex-col gap-2.5 border-t bg-primary/5 px-3 py-3">
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
        <div className="flex shrink-0 flex-col items-end">
          <span className="tnum text-sm font-semibold text-success">${quest.usdc}</span>
          <span className="tnum text-[11px] text-muted-foreground">+{quest.reward} XP</span>
        </div>
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

      {!hasPassport ? (
        <div className="inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] text-warning">
          <IdCard className="size-3.5 shrink-0" /> Passport verification needed before payout
        </div>
      ) : null}

      {verifying ? (
        <Button size="sm" className="w-full" disabled>
          <Loader2 className="size-3.5 animate-spin" /> Verifying…
        </Button>
      ) : (
        <Button size="sm" className="w-full" onClick={onStart}>
          <Sparkles className="size-3.5" /> Start paid quest
        </Button>
      )}
    </div>
  );
}
