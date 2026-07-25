"use client";

import { Check, ImagePlus, LogOut, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TIERS } from "@/lib/game/content";
import { useGame } from "@/lib/game/provider";
import { AccountHeader } from "./account-header";

/** Profile: account identity + editing, World ID verification tiers, payout wallet. */
export function ProfileDialog() {
  const { openPanel, setOpenPanel, user, verify, attachWallet, setHandle, signOut } = useGame();

  return (
    <Dialog open={openPanel === "profile"} onOpenChange={(o) => !o && setOpenPanel(null)}>
      <DialogContent className="max-h-[88svh] gap-0 overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>Your account, verification, and payout wallet.</DialogDescription>
        </DialogHeader>

        <div className="-mr-2 mt-3 max-h-[74svh] space-y-5 overflow-y-auto pr-2">
          {/* Account identity + editing */}
          <section className="space-y-3">
            <AccountHeader />

            {/* mock: name/photo are local only; a real build persists them to the backend keyed to the World ID signup + connected wallet. */}
            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="px-0.5 text-xs font-medium text-muted-foreground">
                Display name
              </label>
              <Input
                id="profile-name"
                value={user.handle}
                placeholder="Guest"
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                // mock: no photo backend — surface intent only.
                onClick={() => toast("Photo upload coming soon")}
              >
                <ImagePlus className="size-3.5" />
                Change photo
              </Button>
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
            </div>
          </section>

          {/* World ID verification */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 px-0.5">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">World ID verification</h3>
            </div>
            <p className="px-0.5 text-xs text-muted-foreground">
              Verification is separate from your XP level. These tiers prove you are a unique human and gate real
              payouts.
            </p>

            <ul className="flex flex-col gap-2">
              {TIERS.map((tier) => {
                const done = user.verification[tier.step];
                return (
                  <li key={tier.step} className="flex items-center gap-3 rounded-lg border p-3">
                    <div
                      className="grid size-9 shrink-0 place-items-center rounded-lg border"
                      style={{ color: tier.color }}
                    >
                      <tier.icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <p className="text-sm font-medium">{tier.name}</p>
                        <span className="text-[11px] text-muted-foreground">{tier.method}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">Unlocks: {tier.unlocks}</p>
                    </div>
                    {done ? (
                      <Badge variant="outline" className="shrink-0 gap-1 border-success/30 text-success">
                        <Check className="size-3" /> Verified
                      </Badge>
                    ) : (
                      <Button size="sm" variant="secondary" className="shrink-0" onClick={() => verify(tier.step)}>
                        Verify
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Payout wallet */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 px-0.5">
              <Wallet className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Payout wallet</h3>
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              {user.wallet ? (
                <p className="tnum flex items-center gap-2 text-sm">
                  <Wallet className="size-4 text-muted-foreground" />
                  {user.wallet}
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Attach a wallet to receive USDC from paid quests.
                  </p>
                  <Button size="sm" className="w-full" onClick={attachWallet}>
                    <Wallet className="size-3.5" />
                    Connect wallet
                  </Button>
                </>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
