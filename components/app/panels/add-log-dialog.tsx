"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  Camera,
  Check,
  ExternalLink,
  Loader2,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AttestationBadge, AttestationDetail } from "@/components/app/attestation";
import { LocationPicker } from "@/components/app/location-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { basescanTx, shortAddr } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { SPECIES_META } from "@/lib/game/content";
import { useGame } from "@/lib/game/provider";
import type { Attestation, PickedPlace, SpeciesId } from "@/lib/game/types";

type Phase = "idle" | "submitting" | "success" | "error";
type OkResult = { attestation: Attestation; leveledTo?: number; txHash?: string };

// Species options, "Other" first as the default free-form pick.
const SPECIES_OPTIONS = (Object.keys(SPECIES_META) as SpeciesId[]).sort((a, b) =>
  a === "Other" ? -1 : b === "Other" ? 1 : SPECIES_META[a].label.localeCompare(SPECIES_META[b].label),
);

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Free-form logging: photo + free-text description + optional species / location,
 *  verified by 0G. Mirrors the quest submit flow, minus the quest constraints. */
export function AddLogDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const { addLog } = useGame();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [species, setSpecies] = useState<SpeciesId>("Other");
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [ok, setOk] = useState<OkResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Reset whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setFile(null);
    setDescription("");
    setSpecies("Other");
    setPlace(null);
    setPhase("idle");
    setOk(null);
    setErr(null);
  }, [open]);

  // Object-URL lifecycle: create on pick, revoke on change/unmount.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const submitting = phase === "submitting";
  const canSubmit = Boolean(file) && description.trim().length >= 3 && !submitting;

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    e.target.value = ""; // allow re-picking the same file after a retake
    if (!f) return;
    setFile(f);
    if (phase === "error") {
      setErr(null);
      setPhase("idle");
    }
  }

  async function onSubmit() {
    if (!file || !canSubmit) return;
    setErr(null);
    setPhase("submitting");
    try {
      const imageDataUrl = await fileToDataUrl(file);
      const res = await addLog({
        imageDataUrl,
        description: description.trim(),
        species,
        place: place ?? undefined,
      });
      if (res.ok) {
        setOk({ attestation: res.attestation, leveledTo: res.leveledTo, txHash: res.txHash });
        setPhase("success");
        toast.success(t("Verified by 0G"), { description: t("+15 XP logged to the dataset") });
      } else {
        setErr(res.reason);
        setPhase("error");
        toast.error(t("Not verified"), { description: res.reason });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("Log failed"));
      setPhase("error");
    }
  }

  const success = phase === "success" && ok;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="p-5">
          <DialogTitle className="text-left text-base leading-tight">{t("Add a sighting")}</DialogTitle>
          <DialogDescription className="text-left">
            {t("Photograph what you see and describe it. 0G verifies the photo against your description.")}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <SuccessView ok={ok} onClose={() => onOpenChange(false)} />
        ) : phase === "error" ? (
          <FailureView
            reason={err}
            onRetry={() => {
              setErr(null);
              setPhase("idle");
            }}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <>
            <div className="flex max-h-[64svh] flex-col gap-3 overflow-y-auto px-5 pb-5">
              {/* photo capture + preview */}
              <label className="group relative flex h-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-background/50 transition-colors hover:border-primary/50">
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPick} />
                {preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={t("Sighting preview")} className="size-full object-cover" />
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[11px] font-medium backdrop-blur-sm">
                      <RotateCcw className="size-3" /> {t("Retake")}
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Camera className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{t("Take a photo")}</p>
                      <p className="text-[11px] text-muted-foreground">{t("Rear camera · JPEG or PNG")}</p>
                    </div>
                  </div>
                )}
              </label>

              {/* free-text description (the 0G assertion) */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="log-description" className="px-0.5 text-xs font-medium text-muted-foreground">
                  {t("What did you see?")}
                </label>
                <Textarea
                  id="log-description"
                  placeholder={t("e.g. A shore crab on the rocks at low tide, whole body visible.")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* optional species */}
              <div className="flex flex-col gap-1.5">
                <label className="px-0.5 text-xs font-medium text-muted-foreground">{t("Species (optional)")}</label>
                <Select value={species} onValueChange={(v) => setSpecies(v as SpeciesId)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIES_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SPECIES_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* optional location */}
              <div className="flex flex-col gap-1.5">
                <span className="px-0.5 text-xs font-medium text-muted-foreground">
                  {t("Where did you see it? (optional)")}
                </span>
                <div className="h-[280px]">
                  <LocationPicker onChange={setPlace} />
                </div>
              </div>
            </div>

            <DialogFooter className="flex-row gap-2 p-4">
              <Button
                className="flex-1 bg-[#B75FFF] text-white hover:bg-[#B75FFF]/90"
                onClick={onSubmit}
                disabled={!canSubmit}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> {t("0G TEE classifying…")}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {t("Verify with")}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/0g-logo.png" alt="0G" className="h-4 w-auto brightness-0 invert" />
                  </span>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SuccessView({ ok, onClose }: { ok: OkResult; onClose: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-4 p-5 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
        <Check className="size-7" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">{t("Verified by 0G")}</p>
        <p className="max-w-[18rem] text-xs text-muted-foreground">{t("Sighting logged to the open dataset.")}</p>
      </div>

      <AttestationBadge attestation={ok.attestation} />

      <div className="w-full max-w-[18rem] rounded-lg border bg-muted/30 p-3 text-left">
        <AttestationDetail attestation={ok.attestation} />
      </div>

      <span className="tnum inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
        +15 XP
      </span>

      {ok.txHash ? (
        <a
          href={basescanTx(ok.txHash)}
          target="_blank"
          rel="noreferrer"
          className="tnum inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ExternalLink className="size-3" />
          {t("Recorded on Base ·")} {shortAddr(ok.txHash)}
        </a>
      ) : null}

      {ok.leveledTo ? (
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> {t("Reached Level")} {ok.leveledTo}
        </p>
      ) : null}

      <Button className="mt-1 w-full" onClick={onClose}>
        {t("Done")}
      </Button>
    </div>
  );
}

function FailureView({
  reason,
  onRetry,
  onClose,
}: {
  reason: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-4 p-5 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <TriangleAlert className="size-7" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">{t("Not verified")}</p>
        <p className="max-w-[18rem] text-xs text-muted-foreground">
          {reason ?? t("0G could not verify this submission. Retake the photo and try again.")}
        </p>
      </div>
      <div className="mt-1 flex w-full gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          {t("Close")}
        </Button>
        <Button className="flex-1" onClick={onRetry}>
          {t("Try again")}
        </Button>
      </div>
    </div>
  );
}
