"use client";

import { Globe, ScanFace, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NauticaLogo } from "@/components/brand/nautica-logo";
import { useGame } from "@/lib/game/provider";

/**
 * Entry gate — the World ID sign-in is step 1 of the loop. Connecting seeds a
 * returning player so the hub is populated for the demo. Real integration swaps
 * connectWorldId() for IDKit verify + nullifier.
 */
export function LoginGate() {
  const { connectWorldId } = useGame();
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl border bg-card/90 p-6 text-center shadow-2xl">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-background">
          <NauticaLogo size={26} />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Sign in to Nautica</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One real human, one account. World ID keeps leaderboards fair and paid
          quests un-farmable.
        </p>
        <Button className="mt-5 w-full" size="lg" onClick={connectWorldId}>
          <Globe className="size-4" />
          Verify with World ID
        </Button>
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ScanFace className="size-3.5" /> Face
          </span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="size-3.5" /> Sybil-resistant
          </span>
        </div>
      </div>
    </div>
  );
}
