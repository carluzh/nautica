"use client";

import { useState, type ReactNode } from "react";
import { Database, FileDown, LogOut, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGame } from "@/lib/game/provider";
import { cn } from "@/lib/utils";
import { AccountHeader } from "./account-header";

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
          "absolute top-0.5 left-0.5 size-3.5 rounded-full bg-foreground shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

export function SettingsDialog() {
  const { openPanel, setOpenPanel, level, grantXp, signOut } = useGame();
  const [notify, setNotify] = useState({ quests: true, streak: false });

  return (
    <Dialog open={openPanel === "settings"} onOpenChange={(o) => !o && setOpenPanel(null)}>
      <DialogContent className="max-h-[88svh] gap-0 overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your account, data, and alerts.</DialogDescription>
        </DialogHeader>

        <div className="-mr-2 mt-3 max-h-[70svh] space-y-5 overflow-y-auto pr-2">
          {/* Account */}
          <Section title="Account">
            <div className="space-y-2">
              <AccountHeader />
              <div className="rounded-lg border">
                <Row label="Sign out" sub="Ends this session">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      signOut();
                      toast("Signed out");
                    }}
                  >
                    <LogOut className="size-3.5" />
                    Sign out
                  </Button>
                </Row>
              </div>
            </div>
          </Section>

          {/* Notifications */}
          {/* mock: these toggles are local-only UI state - there is no backend endpoint
              to persist notification preferences (or deliver the alerts) yet. */}
          <Section title="Notifications">
            <div className="divide-y rounded-lg border">
              <Row label="Quest reminders" sub="A nudge when new dailies drop">
                <Toggle
                  checked={notify.quests}
                  onClick={() => setNotify((n) => ({ ...n, quests: !n.quests }))}
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
                Every sighting carries a 0G TEE attestation - open, auditable biodiversity data.
              </div>
            </div>
          </Section>

          {/* Demo */}
          <Section title="Demo">
            <div className="space-y-2.5 rounded-lg border border-dashed border-warning/40 bg-warning/5 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-warning">
                <Zap className="size-3.5" />
                Demo controls
                <span className="ml-auto font-normal text-muted-foreground">Level {level.level}</span>
              </div>
              <p className="text-xs text-muted-foreground">Grant XP to preview leveling.</p>
              <Button variant="secondary" size="sm" onClick={() => grantXp(25)}>
                +25 XP
              </Button>
            </div>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
