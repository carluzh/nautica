"use client";

import { useState, type ReactNode } from "react";
import {
  Check,
  ChevronRight,
  Database,
  FileDown,
  LogOut,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TIERS } from "@/lib/game/content";
import { levelInfo, PAID_UNLOCK_LEVEL } from "@/lib/game/levels";
import { useGame } from "@/lib/game/provider";
import { cn } from "@/lib/utils";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="px-0.5 text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{label}</div>
        {sub ? <div className="truncate text-xs text-muted-foreground">{sub}</div> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  );
}

/** No Switch primitive exists in the kit, so this is a token-styled pill toggle. */
function Toggle({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        checked ? "border-primary bg-primary" : "border-border bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-3.5 rounded-full bg-foreground shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function SettingsDialog() {
  const { openPanel, setOpenPanel, user, level, paidUnlocked, grantXp } = useGame();
  const [notify, setNotify] = useState({ quests: true, payouts: true, streak: false });
  const initials = user.handle ? user.handle.slice(0, 2).toUpperCase() : "NA";

  return (
    <Dialog open={openPanel === "settings"} onOpenChange={(o) => !o && setOpenPanel(null)}>
      <DialogContent className="max-h-[88svh] gap-0 overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your account, verification, and alerts.</DialogDescription>
        </DialogHeader>

        <div className="-mr-2 mt-3 max-h-[70svh] space-y-5 overflow-y-auto pr-2">
          {/* Account */}
          <Section title="Account">
            <div className="divide-y rounded-lg border">
              <div className="flex items-center gap-3 px-3 py-3">
                <Avatar className="size-9 border">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.handle || "Guest"}</p>
                  <p className="tnum flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Wallet className="size-3" />
                    {user.wallet || "Not connected"}
                  </p>
                </div>
              </div>
              <Row label="Sign out" sub="Ends this session">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast("Session kept for the demo", {
                      description: "Sign-out is disabled so the walkthrough stays live.",
                    })
                  }
                >
                  <LogOut className="size-3.5" />
                  Sign out
                </Button>
              </Row>
            </div>
          </Section>

          {/* Verification */}
          <Section title="Verification">
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                World ID tiers gate payouts, separate from your XP level.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TIERS.map((t) => {
                  const on = user.verification[t.step];
                  return (
                    <span
                      key={t.step}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                        on
                          ? "border-success/30 text-success"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {on ? <Check className="size-3" /> : <t.icon className="size-3" />}
                      {t.name}
                    </span>
                  );
                })}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-between"
                onClick={() => setOpenPanel("profile")}
              >
                Manage verification
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </Section>

          {/* Notifications */}
          <Section title="Notifications">
            <div className="divide-y rounded-lg border">
              <Row label="Quest reminders" sub="A nudge when new dailies drop">
                <Toggle
                  checked={notify.quests}
                  onClick={() => setNotify((n) => ({ ...n, quests: !n.quests }))}
                />
              </Row>
              <Row label="Payout alerts" sub="When USDC settles on Base">
                <Toggle
                  checked={notify.payouts}
                  onClick={() => setNotify((n) => ({ ...n, payouts: !n.payouts }))}
                />
              </Row>
              <Row label="Streak warnings" sub="Before your daily streak lapses">
                <Toggle
                  checked={notify.streak}
                  onClick={() => setNotify((n) => ({ ...n, streak: !n.streak }))}
                />
              </Row>
            </div>
          </Section>

          {/* Data & privacy */}
          <Section title="Data & privacy">
            <div className="divide-y rounded-lg border">
              <Row
                label={
                  <span className="flex items-center gap-2">
                    <Database className="size-3.5 text-muted-foreground" />
                    Export contributions
                  </span>
                }
                sub="Your verified sightings as a GBIF-compatible dataset"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast("Preparing export", { description: "A GBIF-compatible CSV will download." })
                  }
                >
                  <FileDown className="size-3.5" />
                  Export
                </Button>
              </Row>
              <div className="px-3 py-2.5 text-xs text-muted-foreground">
                World ID proves you are a unique human without revealing your identity.
              </div>
            </div>
          </Section>

          {/* Demo */}
          <Section title="Demo">
            <div className="space-y-2.5 rounded-lg border border-dashed border-warning/40 bg-warning/5 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-warning">
                <Zap className="size-3.5" />
                Demo controls
                <span className="ml-auto font-normal text-muted-foreground">
                  Level {level.level}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Honest time-skip. Real play reaches Level {PAID_UNLOCK_LEVEL} in about a week.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={paidUnlocked}
                  onClick={() => {
                    const reached = levelInfo(user.xp + 210).level;
                    grantXp(210);
                    toast.success(`Skipped to Level ${reached}`, {
                      description: "Paid research quests are now unlocked.",
                    });
                  }}
                >
                  {paidUnlocked ? (
                    <>
                      <Check className="size-3.5" />
                      Level {PAID_UNLOCK_LEVEL} reached
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      Skip to Level {PAID_UNLOCK_LEVEL}
                    </>
                  )}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => grantXp(25)}>
                  +25 XP
                </Button>
              </div>
            </div>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
