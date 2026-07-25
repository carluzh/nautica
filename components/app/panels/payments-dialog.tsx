"use client";

import { ArrowUpRight, Banknote, Check, Clock, Eye, Lock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { basescanTx, shortAddr } from "@/lib/format";
import { PAID_UNLOCK_LEVEL, xpForLevel } from "@/lib/game/levels";
import { useGame } from "@/lib/game/provider";
import type { Payment } from "@/lib/game/types";

function StatusBadge({ status }: { status: Payment["status"] }) {
  if (status === "settled") {
    return (
      <Badge variant="outline" className="h-5 gap-1 border-success/30 px-1.5 text-[10px] text-success">
        <Check className="size-2.5" />
        Settled
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-5 gap-1 border-warning/30 px-1.5 text-[10px] text-warning">
      <Clock className="size-2.5" />
      Pending
    </Badge>
  );
}

function PaymentRow({ p }: { p: Payment }) {
  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
        <Banknote className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{p.quest}</p>
        <p className="truncate text-xs text-muted-foreground">{p.partner}</p>
        {p.txHash ? (
          <a
            href={basescanTx(p.txHash)}
            target="_blank"
            rel="noreferrer"
            className="tnum mt-0.5 flex w-fit items-center gap-1 text-[10px] text-muted-foreground/80 hover:underline"
          >
            <ArrowUpRight className="size-2.5" />
            {shortAddr(p.txHash)} · Base
          </a>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="tnum text-sm font-medium text-success">+${p.usdc}</span>
        <StatusBadge status={p.status} />
      </div>
    </li>
  );
}

export function PaymentsDialog() {
  const { openPanel, setOpenPanel, paidUnlocked, level, user, payments, withdraw } = useGame();

  const l5Xp = xpForLevel(PAID_UNLOCK_LEVEL);
  const progressToL5 = Math.min(1, level.totalXp / l5Xp);
  const xpLeft = Math.max(0, l5Xp - level.totalXp);

  function handleWithdraw() {
    const amount = user.balanceUsd;
    withdraw();
    toast.success(`Withdrew $${amount.toFixed(2)} USDC`, {
      description: `Settling to ${user.wallet} on Base.`,
    });
  }

  return (
    <Dialog open={openPanel === "payments"} onOpenChange={(o) => !o && setOpenPanel(null)}>
      <DialogContent className="max-h-[88svh] gap-0 overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle>Payments</DialogTitle>
          <DialogDescription>Partner-funded research payouts in USDC on Base.</DialogDescription>
        </DialogHeader>

        {!paidUnlocked ? (
          // LOCKED state, below the Level 5 paid-quest unlock.
          <div className="mt-4 flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full border bg-muted">
              <Lock className="size-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">Paid research quests unlock at Level {PAID_UNLOCK_LEVEL}</h3>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Complete free daily quests to level up. At Level {PAID_UNLOCK_LEVEL} a partner-funded
                quest appears and pays out in USDC on Base.
              </p>
            </div>

            <div className="w-full max-w-sm space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Level {level.level}</span>
                <span className="tnum text-muted-foreground">
                  {level.totalXp}/{l5Xp} XP
                </span>
              </div>
              <Progress value={progressToL5 * 100} className="h-2" />
              <p className="tnum text-xs text-muted-foreground">
                {xpLeft} XP to Level {PAID_UNLOCK_LEVEL}
              </p>
            </div>

            <Button variant="outline" onClick={() => setOpenPanel(null)}>
              Keep exploring
            </Button>
          </div>
        ) : (
          // UNLOCKED state: earnings header plus payout history.
          <div className="-mr-2 mt-4 max-h-[72svh] space-y-4 overflow-y-auto pr-2">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Claimable balance</p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <p className="tnum text-3xl leading-none font-semibold">
                  ${user.balanceUsd.toFixed(2)}
                </p>
                <Button onClick={handleWithdraw} disabled={user.balanceUsd <= 0}>
                  <ArrowUpRight className="size-4" />
                  Withdraw
                </Button>
              </div>
              <p className="tnum mt-2 text-xs text-muted-foreground">
                USDC on Base · settles to {user.wallet}
              </p>
              {!user.verification.orb ? (
                <p className="mt-2 flex items-center gap-1.5 border-t pt-2 text-xs text-muted-foreground">
                  <Eye className="size-3" />
                  Orb verification lifts the daily payout limit.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-xs font-medium text-muted-foreground">Payout history</h3>
                {payments.length > 0 ? (
                  <span className="tnum text-xs text-muted-foreground">{payments.length}</span>
                ) : null}
              </div>

              {payments.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
                  <Banknote className="size-5 text-muted-foreground" />
                  <p className="text-sm font-medium">No payouts yet</p>
                  <p className="mx-auto max-w-xs text-xs text-muted-foreground">
                    Complete the paid research quest to earn your first USDC payout.
                  </p>
                </div>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {payments.map((p) => (
                    <PaymentRow key={p.id} p={p} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
