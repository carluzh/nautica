"use client";

import { Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGame } from "@/lib/game/provider";

/**
 * Shared account identity block reused by the Profile and Settings dialogs:
 * avatar + name + a payout-wallet line. Reads useGame() itself so callers just
 * drop it in. Theme-aware (card/border/muted tokens), compact.
 */
export function AccountHeader() {
  const { user } = useGame();
  const initials = user.handle ? user.handle.slice(0, 2).toUpperCase() : "NA";

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3">
      <Avatar className="size-9 border">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.handle || "Guest"}</p>
        <p className="tnum flex items-center gap-1 truncate text-xs text-muted-foreground">
          <Wallet className="size-3 shrink-0" />
          {user.wallet ? user.wallet : "No payout wallet connected"}
        </p>
      </div>
    </div>
  );
}
