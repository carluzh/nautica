"use client";

import { Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGame } from "@/lib/game/provider";
import { useT } from "@/lib/i18n";

// Shared account identity block for the Profile and Settings dialogs.
export function AccountHeader() {
  const { user } = useGame();
  const t = useT();
  const initials = user.handle ? user.handle.slice(0, 2).toUpperCase() : "NA";

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3">
      <Avatar className="size-9 border">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.handle || t("Guest")}</p>
        <p className="tnum flex items-center gap-1 truncate text-xs text-muted-foreground">
          <Wallet className="size-3 shrink-0" />
          {user.wallet ? user.wallet : t("No on-chain address yet")}
        </p>
      </div>
    </div>
  );
}
