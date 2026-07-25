"use client";

import type { ReactNode } from "react";
import { Globe, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function ComingSoonButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Button variant="outline" size="lg" className="w-full gap-2" disabled>
      {icon}
      {label}
      <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        Soon
      </span>
    </Button>
  );
}

export function LoginGate() {
  const { connectWorldId, connecting, error } = useGame();
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-2xl border bg-card/90 p-6 text-center shadow-2xl">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-background">
          {/* Brand mark tinted coral via CSS mask, matching the sidebar. */}
          <span
            role="img"
            aria-label="Nautica"
            className="size-7"
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
        </div>
        <h1 className="mt-4 text-lg font-semibold">Sign in to Nautica</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One real human, one account. World ID keeps the dataset and leaderboards fair.
        </p>

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

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-2">
          <ComingSoonButton icon={<GraduationCap className="size-4" />} label="Continue with University" />
          <ComingSoonButton icon={<GoogleIcon className="size-4" />} label="Continue with Google" />
        </div>

        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          University and Google sign-in are coming soon. For now, verify once with World ID
          to start logging findings.
        </p>
      </div>
    </div>
  );
}
