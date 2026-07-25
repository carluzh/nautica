"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  Building2,
  Camera,
  Check,
  Circle,
  Coins,
  Crosshair,
  ExternalLink,
  Fingerprint,
  IdCard,
  Loader2,
  MapPin,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AttestationBadge, AttestationDetail } from "@/components/app/attestation";
import { LocationPicker } from "@/components/app/location-picker";
import { SpeciesBadge } from "@/components/app/species-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { basescanTx, shortAddr } from "@/lib/format";
import { CATEGORY_META, SPECIES_META, mapIcon, speciesCategory } from "@/lib/game/content";
import { useGame } from "@/lib/game/provider";
import type { Attestation, PickedPlace, Quest } from "@/lib/game/types";
import { cn } from "@/lib/utils";

type Phase = "idle" | "submitting" | "success" | "error";
type Step = 1 | 2 | 3;
type OkResult = { attestation: Attestation; leveledTo?: number; usdc?: number; txHash?: string };

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Photo" },
  { n: 2, label: "Location" },
  { n: 3, label: "Verify" },
];

function makeNonce(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function fmtRadius(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

/** Quest submission wizard: photo -> location (full-canvas map) -> 0G verify. */
export function QuestSubmitDialog() {
  const { openPanel, setOpenPanel, activeQuestId, quests, submitQuest, user } = useGame();
  const quest = quests.find((q) => q.id === activeQuestId);
  const open = openPanel === "quest";
  const isPaid = quest?.kind === "paid";
  const meta = quest ? SPECIES_META[quest.species] : null;
  // Use the consolidated map/category icon (e.g. crab shows the Marine-life fish, not a beetle).
  const QuestIcon = quest ? mapIcon(quest.species) : null;

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [ok, setOk] = useState<OkResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string>("");
  const [place, setPlace] = useState<PickedPlace | null>(null);

  // (Re)initialize whenever the dialog opens for a quest. Random nonce runs
  // client-only here, so there is no SSR hydration mismatch.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFile(null);
    setPhase("idle");
    setOk(null);
    setErr(null);
    setPlace(null);
    setNonce(makeNonce());
  }, [open, quest?.id]);

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

  function close() {
    setStep(1);
    setFile(null);
    setPhase("idle");
    setOk(null);
    setErr(null);
    setOpenPanel(null);
  }

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
    if (!quest || !file || submitting) return;
    setErr(null);
    setPhase("submitting");
    const res = await submitQuest(quest.id, file, place ?? undefined);
    if (res.ok) {
      setOk({ attestation: res.attestation, leveledTo: res.leveledTo, usdc: res.usdc, txHash: res.txHash });
      setPhase("success");
      toast.success("Verified by 0G", {
        description:
          isPaid && res.usdc
            ? `+${quest.reward} XP · $${res.usdc} USDC on Base`
            : `+${quest.reward} XP logged to the dataset`,
      });
    } else {
      setErr(res.reason);
      setPhase("error");
      toast.error("Not verified", { description: res.reason });
    }
  }

  const success = phase === "success" && ok;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[92svh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        {quest ? (
          <>
            <DialogHeader className="p-5">
              <div className="flex items-center gap-3">
                {QuestIcon ? (
                  <span
                    className="grid size-14 shrink-0 place-items-center rounded-full"
                    style={{
                      backgroundColor: `color-mix(in oklch, ${CATEGORY_META[speciesCategory(quest.species)].color} 14%, transparent)`,
                      color: CATEGORY_META[speciesCategory(quest.species)].color,
                    }}
                  >
                    <QuestIcon className="size-7" fill="currentColor" />
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-left text-base leading-tight">{quest.title}</DialogTitle>
                  <DialogDescription className="mt-1 text-left">{quest.spec}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {success ? (
              <SuccessView quest={quest} ok={ok} isPaid={isPaid} onClose={close} />
            ) : phase === "error" ? (
              <FailureView
                reason={err}
                onRetry={() => {
                  setErr(null);
                  setPhase("idle");
                  setStep(1);
                }}
                onClose={close}
              />
            ) : (
              <>
                {/* step indicator + reward goal */}
                <div className="flex items-center justify-between gap-2 px-5 pb-3">
                  <div className="flex items-center gap-3">
                    {STEPS.map((it) => (
                      <div key={it.n} className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full text-[11px] font-medium transition-colors",
                            step > it.n
                              ? "bg-primary text-primary-foreground"
                              : step === it.n
                                ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {step > it.n ? <Check className="size-3" /> : it.n}
                        </span>
                        <span
                          className={cn(
                            "text-xs",
                            step === it.n ? "font-medium text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {it.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {isPaid ? (
                    <span className="tnum inline-flex shrink-0 items-center rounded-md bg-success/15 px-2 py-1 text-xs font-semibold text-success">
                      ${quest.usdc}
                    </span>
                  ) : (
                    <span className="tnum inline-flex shrink-0 items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      +{quest.reward} XP
                    </span>
                  )}
                </div>

                {/* step body - sizes to each step's content so the modal height adapts */}
                <div className="px-5 pb-5">
                  {step === 1 ? (
                    <PhotoStep
                      quest={quest}
                      isPaid={isPaid}
                      passport={user.verification.face}
                      nonce={nonce}
                      preview={preview}
                      onPick={onPick}
                    />
                  ) : step === 2 ? (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Where did you see it?
                      </span>
                      <div className="h-[320px]">
                        <LocationPicker onChange={setPlace} />
                      </div>
                    </div>
                  ) : (
                    <ReviewStep
                      quest={quest}
                      isPaid={isPaid}
                      passport={user.verification.face}
                      preview={preview}
                      place={place}
                    />
                  )}
                </div>

                {/* footer nav */}
                <DialogFooter className="flex-row gap-2 p-4">
                  {step > 1 ? (
                    <Button
                      variant="outline"
                      onClick={() => setStep((s) => (s - 1) as Step)}
                      disabled={submitting}
                    >
                      Back
                    </Button>
                  ) : null}
                  {step < 3 ? (
                    <Button
                      className="flex-1"
                      onClick={() => setStep((s) => (s + 1) as Step)}
                      disabled={step === 1 && !file}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 bg-[#B75FFF] text-white hover:bg-[#B75FFF]/90"
                      onClick={onSubmit}
                      disabled={!file || submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> 0G TEE classifying…
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          Verify with
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/0g-logo.png" alt="0G" className="h-4 w-auto brightness-0 invert" />
                        </span>
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">Quest not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Step 1 - freshness nonce, paid requirements, and the camera capture. */
function PhotoStep({
  quest,
  isPaid,
  passport,
  nonce,
  preview,
  onPick,
}: {
  quest: Quest;
  isPaid: boolean;
  passport: boolean;
  nonce: string;
  preview: string | null;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* per-submission challenge + what 0G checks */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
        <Fingerprint className="size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">
            Challenge <span className="tnum text-primary">#{nonce || "····"}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/80">0G checks</span> your photo against the quest.
          </p>
        </div>
      </div>

      {isPaid ? (
        <div className="flex flex-col gap-2 rounded-lg border bg-background/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="size-3.5 shrink-0" />
              <span className="truncate">{quest.partner}</span>
            </span>
            <span className="tnum shrink-0 text-sm font-semibold text-success">${quest.usdc}</span>
          </div>
          {quest.requirements?.length ? (
            <ul className="flex flex-col gap-1">
              {quest.requirements.map((r) => (
                <li key={r} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Circle className="size-3 shrink-0 text-primary/70" />
                  {r}
                </li>
              ))}
            </ul>
          ) : null}
          {!passport ? (
            <div className="mt-1 flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] text-warning">
              <IdCard className="size-3.5 shrink-0" />
              Selfie (Face) verification needed to receive USDC.
            </div>
          ) : null}
        </div>
      ) : null}

      {/* photo capture + preview */}
      <label className="group relative flex h-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-background/50 transition-colors hover:border-primary/50">
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPick} />
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Quest submission preview" className="size-full object-cover" />
            <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[11px] font-medium backdrop-blur-sm">
              <RotateCcw className="size-3" /> Retake
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Camera className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Take a photo</p>
              <p className="text-[11px] text-muted-foreground">Rear camera · JPEG or PNG</p>
            </div>
          </div>
        )}
      </label>
    </div>
  );
}

/** Step 3 - a compact review of the capture + location before 0G verification. */
function ReviewStep({
  quest,
  isPaid,
  passport,
  preview,
  place,
}: {
  quest: Quest;
  isPaid: boolean;
  passport: boolean;
  preview: string | null;
  place: PickedPlace | null;
}) {
  const meta = SPECIES_META[quest.species];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="size-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Review" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <SpeciesBadge species={quest.species} iconClassName="size-7" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-medium">{meta.label}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {place ? (
              <span className="tnum">
                {place.lat.toFixed(4)}, {place.lng.toFixed(4)} · {fmtRadius(place.radiusM)}
              </span>
            ) : (
              <span>No location set</span>
            )}
          </div>
          {place ? (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Crosshair className={cn("size-3", place.gpsAnchored ? "text-primary" : "text-warning")} />
              {place.gpsAnchored ? "GPS-anchored" : "GPS off · unverified location"}
            </div>
          ) : null}
        </div>
      </div>

      {isPaid && !passport ? (
        <div className="flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] text-warning">
          <IdCard className="size-3.5 shrink-0" />
          Passport (Identity Check) needed to receive USDC.
        </div>
      ) : null}

      <div className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Your photo is classified in a 0G TEE (qwen3-vl-30b · Intel TDX). Only a verified pass awards XP.
      </div>
    </div>
  );
}

function SuccessView({
  quest,
  ok,
  isPaid,
  onClose,
}: {
  quest: Quest;
  ok: OkResult;
  isPaid: boolean;
  onClose: () => void;
}) {
  const meta = SPECIES_META[quest.species];
  return (
    <div className="flex flex-col items-center gap-4 p-5 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
        <Check className="size-7" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">Verified by 0G</p>
        <p className="max-w-[18rem] text-xs text-muted-foreground">
          {meta.label} logged to the open dataset.
        </p>
      </div>

      <AttestationBadge attestation={ok.attestation} />

      <div className="w-full max-w-[18rem] rounded-lg border bg-muted/30 p-3 text-left">
        <AttestationDetail attestation={ok.attestation} />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="tnum inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
          +{quest.reward} XP
        </span>
        {isPaid && ok.usdc ? (
          <span className="tnum inline-flex items-center gap-1 rounded-lg bg-success/15 px-3 py-1.5 text-sm font-semibold text-success">
            <Coins className="size-4" /> +${ok.usdc} USDC
          </span>
        ) : null}
      </div>

      {ok.txHash ? (
        <a
          href={basescanTx(ok.txHash)}
          target="_blank"
          rel="noreferrer"
          className="tnum inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          <ExternalLink className="size-3" />
          {isPaid && ok.usdc ? "Recorded + paid on Base" : "Recorded on Base"} · {shortAddr(ok.txHash)}
        </a>
      ) : null}

      {ok.leveledTo ? (
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Reached Level {ok.leveledTo}
        </p>
      ) : null}

      <Button className="mt-1 w-full" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

/** Failure screen - a fresh modal state shown when 0G rejects the submission. */
function FailureView({
  reason,
  onRetry,
  onClose,
}: {
  reason: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-5 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <TriangleAlert className="size-7" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">Not verified</p>
        <p className="max-w-[18rem] text-xs text-muted-foreground">
          {reason ?? "0G could not verify this submission. Retake the photo and try again."}
        </p>
      </div>
      <div className="mt-1 flex w-full gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Close
        </Button>
        <Button className="flex-1" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}
