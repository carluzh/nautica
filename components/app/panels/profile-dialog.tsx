"use client";

import { ImagePlus, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useGame } from "@/lib/game/provider";
import { useT } from "@/lib/i18n";
import { AccountHeader } from "./account-header";

/** Profile: account identity + display-name editing + sign out. */
export function ProfileDialog() {
  const t = useT();
  const { openPanel, setOpenPanel, user, setHandle, signOut } = useGame();

  return (
    <Dialog open={openPanel === "profile"} onOpenChange={(o) => !o && setOpenPanel(null)}>
      <DialogContent className="max-h-[88svh] gap-0 overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle>{t("Profile")}</DialogTitle>
          <DialogDescription>{t("Your account and display name.")}</DialogDescription>
        </DialogHeader>

        <div className="-mr-2 mt-3 max-h-[74svh] space-y-5 overflow-y-auto pr-2">
          {/* Account identity + editing */}
          <section className="space-y-3">
            <AccountHeader />

            {/* mock: name/photo are local only; a real build persists them to the backend keyed to the account identity. */}
            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="px-0.5 text-xs font-medium text-muted-foreground">
                {t("Display name")}
              </label>
              <Input
                id="profile-name"
                value={user.handle}
                placeholder={t("Guest")}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                // mock: no photo backend - surface intent only.
                onClick={() => toast(t("Photo upload coming soon"))}
              >
                <ImagePlus className="size-3.5" />
                {t("Change photo")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  signOut();
                  toast(t("Signed out"));
                }}
              >
                <LogOut className="size-3.5" />
                {t("Sign out")}
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
