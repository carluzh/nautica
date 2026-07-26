"use client";

// Lightweight i18n. Translations are keyed by the English source string, so any
// string the UI hasn't translated (or the sweep missed) simply renders in English -
// there is no way for a missing key to break a screen. English is the canonical
// default; German is opt-in via the toggle or a ?lang=de link (shareable).

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Globe } from "lucide-react";
import { DE } from "./de";
import { cn } from "@/lib/utils";

export type Lang = "en" | "de";

type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string };
const LangContext = createContext<LangCtx | null>(null);

const STORE_KEY = "nautica.lang";

export function LangProvider({ children }: { children: ReactNode }) {
  // Start in English on both server and first client render (no hydration mismatch);
  // a stored/URL preference is applied in the effect right after mount.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const url = new URLSearchParams(window.location.search).get("lang");
    const stored = window.localStorage.getItem(STORE_KEY);
    const initial: Lang = url === "de" || url === "en" ? url : stored === "de" ? "de" : "en";
    setLangState(initial);
    document.documentElement.lang = initial;
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORE_KEY, l);
    } catch {
      // ignore storage failures (private mode etc.)
    }
    document.documentElement.lang = l;
  };

  const t = (s: string) => (lang === "de" ? DE[s] ?? s : s);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within <LangProvider>");
  return ctx;
}

/** Just the translator, for terse call sites: `const t = useT();` then `t("...")`. */
export function useT(): (s: string) => string {
  return useLang().t;
}

/** Compact EN | DE switch. Drop it anywhere inside the provider. */
export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border bg-background/80 p-0.5 text-[11px] font-medium backdrop-blur-sm",
        className,
      )}
    >
      <Globe className="ml-1 size-3 text-muted-foreground" aria-hidden />
      {(["en", "de"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "rounded-full px-1.5 py-0.5 uppercase transition-colors",
            lang === l ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
