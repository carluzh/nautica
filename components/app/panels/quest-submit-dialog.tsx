"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  Building2,
  Camera,
  Check,
  Circle,
  Coins,
  Fingerprint,
  IdCard,
  Loader2,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { AttestationBadge, AttestationDetail } from "@/components/app/attestation";
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
import { SPECIES_META } from "@/lib/game/content";
import { useGame } from "@/lib/game/provider";
import type { Attestation, Quest } from "@/lib/game/types";
import { cn } from "@/lib/utils";

type Phase = "idle" | "submitting" | "success" | "error";
type OkResult = { attestation: Attestation; leveledTo?: number; usdc?: number };

function makeNonce(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

/** Quest submission: freshness challenge, photo capture, 0G verify, attestation. */
export function QuestSubmitDialog() {
  const { openPanel, setOpenPanel, activeQuestId, quests, submitQuest, user } = useGame();
  const quest = quests.find((q) => q.id === activeQuestId);
  const open = openPanel === "quest";
  const isPaid = quest?.kind === "paid";
  const meta = quest ? SPECIES_META[quest.species] : null;

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [ok, setOk] = useState<OkResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string>("");

  // (Re)initialize whenever the dialog opens for a quest. Random nonce runs
  // client-only here, so there is no SSR hydration mismatch.
  useEffect(() => {
    if (!open) return;
    setFile(null);
    setPhase("idle");
    setOk(null);
    setErr(null);
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
    const res = await submitQuest(quest.id, file);
    if (res.ok) {
      setOk({ attestation: res.attestation, leveledTo: res.leveledTo, usdc: res.usdc });
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90svh] gap-0 overflow-y-auto p-0 sm:max-w-md">
        {quest ? (
          <>
            <DialogHeader className="gap-2 border-b p-5">
              <div className="flex flex-wrap items-center gap-1.5">
                {meta ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border bg-background py-0.5 pr-2 pl-1 text-[11px] text-muted-foreground">
                    <SpeciesBadge species={quest.species} className="size-5 rounded" iconClassName="size-3" />
                    {meta.short}
                  </span>
                ) : null}
                {isPaid ? (
                  <span className="tnum inline-flex items-center gap-1 rounded-md bg-success/15 px-1.5 py-0.5 text-[11px] font-medium text-success">
                    <Coins className="size-3" /> Paid · ${quest.usdc}
                  </span>
                ) : (
                  <span className="tnum inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                    +{quest.reward} XP
                  </span>
                )}
              </div>
              <DialogTitle className="text-left">{quest.title}</DialogTitle>
              <DialogDescription className="text-left">
                <span className="font-medium text-foreground/80">0G checks: </span>
                {quest.spec}
              </DialogDescription>
            </DialogHeader>

            {phase === "success" && ok ? (
              <SuccessView quest={quest} ok={ok} isPaid={isPaid} />
            ) : (
              <div className="flex flex-col gap-4 p-5">
                {/* freshness nonce: anti-fraud challenge */}
                <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/40 px-3 py-2">
                  <Fingerprint className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">
                      Challenge <span className="tnum text-primary">#{nonce || "····"}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Photo must be taken now. No library uploads.
                    </p>
                  </div>
                </div>

                {/* paid: partner, reward, requirement checklist */}
                {isPaid ? (
                  <div className="flex flex-col gap-2 rounded-lg border bg-background/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="size-3.5 shrink-0" />
                        <span className="truncate">{quest.partner}</span>
                      </span>
                      <span className="tnum shrink-0 text-sm font-semibold text-success">
                        ${quest.usdc}
                      </span>
                    </div>
                    {quest.requirements?.length ? (
                      <ul className="flex flex-col gap-1">
                        {quest.requirements.map((r) => (
                          <li
                            key={r}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <Circle className="size-3 shrink-0 text-primary/70" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {!user.verification.passport ? (
                      <div className="mt-1 flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] text-warning">
                        <IdCard className="size-3.5 shrink-0" />
                        Passport (Identity Check) needed to receive USDC.
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* photo capture + preview */}
                <label
                  className={cn(
                    "group relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-background/50 transition-colors hover:border-primary/50",
                    submitting && "pointer-events-none cursor-default",
                  )}
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={onPick}
                    disabled={submitting}
                  />
                  {preview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt="Quest submission preview"
                        className="size-full object-cover"
                      />
                      {!submitting ? (
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[11px] font-medium backdrop-blur-sm">
                          <RotateCcw className="size-3" /> Retake
                        </span>
                      ) : null}
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

                  {submitting ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-sm">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <p className="text-sm font-medium">0G TEE classifying…</p>
                      <p className="tnum text-[11px] text-muted-foreground">
                        qwen3-vl-30b · Intel TDX
                      </p>
                    </div>
                  ) : null}
                </label>

                {/* inline error (e.g. locked / verification needed) */}
                {phase === "error" && err ? (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <span>{err}</span>
                  </div>
                ) : null}
              </div>
            )}

            <DialogFooter className="gap-2 border-t p-5 pt-4">
              {phase === "success" ? (
                <Button className="w-full" onClick={close}>
                  Done
                </Button>
              ) : (
                <Button className="w-full" onClick={onSubmit} disabled={!file || submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> 0G TEE classifying…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" /> Verify with 0G
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">Quest not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SuccessView({
  quest,
  ok,
  isPaid,
}: {
  quest: Quest;
  ok: OkResult;
  isPaid: boolean;
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

      {ok.leveledTo ? (
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Reached Level {ok.leveledTo}
        </p>
      ) : null}
    </div>
  );
}
