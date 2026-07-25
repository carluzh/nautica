"use client";

import { useEffect } from "react";
import { AlertTriangle, Database, ExternalLink, Images, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AttestationBadge } from "@/components/app/attestation";
import { SpeciesBadge } from "@/components/app/species-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SPECIES_META } from "@/lib/game/content";
import { useGame } from "@/lib/game/provider";
import type { GalleryItem, PlausibilityVerdict } from "@/lib/game/types";
import { basescanTx, shortAddr, timeAgo } from "@/lib/format";

const VERDICT_TONE: Record<PlausibilityVerdict["verdict"], { dot: string; text: string; label: string }> = {
  plausible: { dot: "bg-success", text: "text-success", label: "Plausible" },
  unusual: { dot: "bg-warning", text: "text-warning", label: "Unusual" },
  implausible: { dot: "bg-destructive", text: "text-destructive", label: "Implausible" },
};

/** Plausibility agent verdict — a small chip reasoning over the subgraph record. */
function PlausibilityChip({ verdict }: { verdict: PlausibilityVerdict }) {
  const tone = VERDICT_TONE[verdict.verdict];
  return (
    <div className="flex items-center gap-1.5" title={verdict.narrative ?? verdict.reasons.join(" ")}>
      <span className={`inline-block size-1.5 shrink-0 rounded-full ${tone.dot}`} />
      <span className={`text-[11px] font-medium ${tone.text}`}>{tone.label}</span>
      {verdict.notable ? (
        <span className="rounded-full bg-warning/15 px-1.5 py-px text-[10px] font-medium text-warning">
          Invasive here
        </span>
      ) : null}
    </div>
  );
}

// Sighting ids already surfaced as a plausibility toast this session. Module-level
// so it survives Card unmount/remount (reopening the gallery won't re-toast).
const flagged = new Set<string>();

function Card({ item }: { item: GalleryItem }) {
  const meta = SPECIES_META[item.species];
  const { plausibility, plausibilityPending, loadPlausibility } = useGame();
  const verdict = plausibility[item.id];
  const checking = plausibilityPending[item.id];

  useEffect(() => {
    loadPlausibility(item.id);
  }, [item.id, loadPlausibility]);

  // Fire a one-time toast when the verdict resolves to unusual/implausible.
  useEffect(() => {
    if (!verdict || flagged.has(item.id)) return;
    if (verdict.verdict === "implausible" || verdict.verdict === "unusual") {
      flagged.add(item.id);
      const label = SPECIES_META[item.species].label;
      const fire = verdict.verdict === "implausible" ? toast.error : toast.warning;
      fire(`Flagged: ${label} looks ${verdict.verdict} here`, {
        description: verdict.narrative ?? verdict.reasons[0] ?? verdict.rangeNote,
      });
    }
  }, [verdict, item.id, item.species]);

  return (
    <div className="group overflow-hidden rounded-lg border bg-card">
      <div className="relative aspect-square w-full overflow-hidden">
        {item.photo ? (
          // Captured photo is a runtime object URL (blob:), so a plain img is correct here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photo}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <SpeciesBadge species={item.species} iconClassName="size-10" />
          </div>
        )}

        {meta.hazard ? (
          <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center rounded-full bg-background/80 p-1 backdrop-blur-sm">
            <AlertTriangle className="size-3 text-warning" />
          </span>
        ) : null}

        <AttestationBadge
          attestation={item.attestation}
          className="absolute bottom-1.5 left-1.5 h-5 gap-1 bg-background/80 px-1.5 text-[10px] backdrop-blur-sm"
        />
      </div>

      <div className="space-y-1 p-2.5">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{meta.short}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="tnum text-xs font-medium text-primary">+{item.xp}</span>
            {item.usdc ? (
              <span className="tnum text-xs font-medium text-success">${item.usdc}</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            <span className="tnum">
              {item.lat.toFixed(2)}, {item.lng.toFixed(2)}
            </span>
          </span>
          <span className="tnum">{timeAgo(item.at)}</span>
        </div>
        {verdict ? (
          <PlausibilityChip verdict={verdict} />
        ) : checking ? (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Checking plausibility…
          </div>
        ) : null}
        {item.storageRoot ? (
          <div
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            title={`0G Storage root ${item.storageRoot}`}
          >
            <Database className="size-3 text-primary" />
            <span className="tnum">0G Storage · {shortAddr(item.storageRoot)}</span>
          </div>
        ) : null}
        {item.txHash ? (
          <a
            href={basescanTx(item.txHash)}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-1.5 text-[11px] text-muted-foreground hover:underline"
            title={`Recorded on Base · ${item.txHash}`}
          >
            <ExternalLink className="size-3 text-primary" />
            <span className="tnum">Base · {shortAddr(item.txHash)}</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function GalleryDialog() {
  const { openPanel, setOpenPanel, gallery } = useGame();

  return (
    <Dialog open={openPanel === "gallery"} onOpenChange={(o) => !o && setOpenPanel(null)}>
      <DialogContent className="max-h-[88svh] gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <Images className="size-4 text-muted-foreground" />
            Field gallery
            {gallery.length > 0 ? (
              <span className="tnum rounded-full bg-secondary px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                {gallery.length}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Your verified sightings. Every photo carries a 0G TEE attestation.
          </DialogDescription>
        </DialogHeader>

        {gallery.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full border bg-muted">
              <Images className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No sightings yet</p>
              <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                Complete a daily quest to add your first verified photo to the collection.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setOpenPanel(null)}>
              Find a quest
            </Button>
          </div>
        ) : (
          <div className="-mr-2 mt-3 max-h-[64svh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((item) => (
                <Card key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
