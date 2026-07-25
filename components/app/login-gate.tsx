"use client";

import { Globe, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NauticaLogo } from "@/components/brand/nautica-logo";
import { useGame } from "@/lib/game/provider";

/** Four-colour Google "G" (lucide has no brand marks). */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.82-.07-1.6-.21-2.36H12v4.47h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.49Z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.9c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.76H1.7v2.99A11.5 11.5 0 0 0 12 23.5Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.15a6.9 6.9 0 0 1 0-4.3V6.86H1.7a11.5 11.5 0 0 0 0 10.28l3.85-2.99Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.72 1.3 15.11.25 12 .25A11.5 11.5 0 0 0 1.7 6.86l3.85 2.99C6.46 6.98 9 4.75 12 4.75Z"
      />
    </svg>
  );
}

/**
 * Entry gate — three ways in. World ID is primary and is the only method that
 * makes an account Sybil-resistant; Google / Wallet are low-friction entry.
 * In mock mode every method seeds a returning player; real Google/Wallet auth
 * needs backend routes (server/) that don't exist yet.
 */
export function LoginGate() {
  const { connectWorldId, connectGoogle, connectWallet, connecting, error } = useGame();
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl border bg-card/90 p-6 text-center shadow-2xl">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-background">
          <NauticaLogo size={26} />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Sign in to Nautica</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One real human, one account. World ID keeps leaderboards fair — and
          unlocks paid quests.
        </p>

        {/* Primary — World ID */}
        <Button
          className="mt-5 w-full"
          size="lg"
          onClick={connectWorldId}
          disabled={connecting}
        >
          {connecting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Globe className="size-4" />
          )}
          {connecting ? "Verifying…" : "Continue with World ID"}
        </Button>

        {/* Divider */}
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Secondary — Google + Wallet */}
        <div className="grid gap-2">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={connectGoogle}
            disabled={connecting}
          >
            <GoogleIcon className="size-4" />
            Continue with Google
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={connectWallet}
            disabled={connecting}
          >
            <Wallet className="size-4" />
            Continue with Wallet
          </Button>
        </div>

        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Google or a wallet lets you explore and play free quests. Verify with
          World ID to earn payouts and rank on the leaderboard.
        </p>
      </div>
    </div>
  );
}
