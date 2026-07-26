"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGame } from "@/lib/game/provider";
import { LangToggle, useT } from "@/lib/i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export function LoginGate() {
  const { connectGuest, loginEmail, connecting, error } = useGame();
  const t = useT();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const emailValid = EMAIL_RE.test(email.trim());
  const passwordValid = password.length >= MIN_PASSWORD;
  const canSubmit = emailValid && passwordValid && !connecting;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!emailValid) {
      setFormError(t("Enter a valid email address."));
      return;
    }
    if (!passwordValid) {
      setFormError(t("Password must be at least ${MIN_PASSWORD} characters."));
      return;
    }
    try {
      await loginEmail(email.trim(), password);
    } catch {
      // Provider surfaces the message via `error`; keep the form open.
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-2xl border bg-card/90 p-6 shadow-2xl">
        <LangToggle className="absolute top-3 right-3" />
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
        <h1 className="mt-4 text-center text-lg font-semibold">{t("Welcome to Nautica")}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {t("Log verified marine sightings, earn XP, and climb the leaderboard.")}
        </p>

        <Button
          className="mt-5 w-full"
          size="lg"
          variant="default"
          onClick={connectGuest}
          disabled={connecting}
        >
          {connecting ? <Loader2 className="size-4 animate-spin" /> : <UserRound className="size-4" />}
          {t("Continue as guest")}
        </Button>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t("or with email")}
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onSubmit} className="grid gap-2.5">
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={connecting}
          />
          <Input
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            placeholder={t("Password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={connecting}
          />
          <Button type="submit" size="lg" variant="secondary" className="w-full" disabled={!canSubmit}>
            {connecting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            {mode === "register" ? t("Create account") : t("Sign in")}
          </Button>
        </form>

        {formError || error ? (
          <p className="mt-3 text-center text-xs text-destructive">{formError ?? error}</p>
        ) : null}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "register" ? t("Already have an account?") : t("New to Nautica?")}{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              setMode((m) => (m === "register" ? "signin" : "register"));
              setFormError(null);
            }}
          >
            {mode === "register" ? t("Sign in") : t("Create an account")}
          </button>
        </p>
      </div>
    </div>
  );
}
