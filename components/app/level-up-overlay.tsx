"use client";

import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { LEVEL_UNLOCKS } from "@/lib/game/levels";
import { useGame } from "@/lib/game/provider";

/** Brief celebration when the player crosses a level. Auto-dismisses. */
export function LevelUpOverlay() {
  const { lastLevelUp, dismissLevelUp } = useGame();

  useEffect(() => {
    if (lastLevelUp == null) return;
    const t = setTimeout(dismissLevelUp, 2600);
    return () => clearTimeout(t);
  }, [lastLevelUp, dismissLevelUp]);

  if (lastLevelUp == null) return null;
  const unlock = LEVEL_UNLOCKS[lastLevelUp];

  return (
    <button
      onClick={dismissLevelUp}
      className="absolute inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm duration-300 animate-in fade-in"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/30 bg-card px-10 py-8 text-center shadow-2xl duration-500 animate-in zoom-in-95">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-7" />
        </div>
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Level up</p>
        <p className="tnum text-4xl font-semibold">Level {lastLevelUp}</p>
        {unlock ? (
          <p className="max-w-[16rem] text-sm text-muted-foreground">Unlocked: {unlock}</p>
        ) : null}
      </div>
    </button>
  );
}
