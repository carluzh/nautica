"use client";

import type { ReactNode } from "react";
import { ExternalLink, FlaskConical, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { chainscanAddress, shortAddr } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Attestation } from "@/lib/game/types";

// Badge reflects the true verification state, never a hard-coded "verified":
// quoteVerified (independent Intel TDX quote) is strongest, then teeVerified
// (router-attested TEE); on-chain-reconstructed records carry neither but are real.
type Status = "hw" | "tee" | "onchain" | "simulated" | "unverified";

function statusOf(a: Attestation): Status {
  if (a.quoteVerified === true) return "hw";
  if (a.teeVerified === true) return "tee";
  if (a.simulated === true || a.attestationSource === "simulated") return "simulated";
  if (a.simulated === false && a.teeVerified === undefined) return "onchain"; // reconstructed on-chain record
  return "unverified";
}

const BADGE: Record<Status, { label: string; tone: string; Icon: typeof ShieldCheck }> = {
  hw: { label: "TEE-verified · Intel TDX", tone: "border-success/30 text-success", Icon: ShieldCheck },
  tee: { label: "TEE-verified", tone: "border-success/30 text-success", Icon: ShieldCheck },
  onchain: { label: "0G attested", tone: "border-success/20 text-success/80", Icon: ShieldCheck },
  simulated: { label: "Simulated", tone: "border-warning/30 text-warning", Icon: FlaskConical },
  unverified: { label: "Unverified", tone: "border-muted-foreground/30 text-muted-foreground", Icon: ShieldAlert },
};

function AddrLink({ addr }: { addr: string }) {
  return (
    <a
      href={chainscanAddress(addr)}
      target="_blank"
      rel="noreferrer"
      className="tnum inline-flex items-center gap-0.5 hover:underline"
    >
      {shortAddr(addr)}
      <ExternalLink className="size-3" />
    </a>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/** Shared attestation detail body (popover + submit-success panel). */
export function AttestationDetail({ attestation: a }: { attestation: Attestation }) {
  const status = statusOf(a);
  const mode = a.verifiability ?? a.providerVerifiability;
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium text-foreground">TEE attestation</span>
        <span className={cn("font-medium", a.verdict === "pass" ? "text-success" : "text-destructive")}>
          {a.verdict === "pass" ? "Pass" : "Fail"}
        </span>
      </div>
      {a.label ? <p className="text-muted-foreground italic">“{a.label}”</p> : null}
      <div className="space-y-1 border-t pt-1.5">
        <Row label="Model">
          <span className="tnum">{a.model}</span>
        </Row>
        <Row label="Confidence">
          <span className="tnum">{Math.round(a.confidence * 100)}%</span>
        </Row>
        <Row label="Enclave">{a.tee}</Row>
        {mode ? <Row label="Mode">{mode}</Row> : null}
        {a.quoteVerified === true ? (
          <Row label="Intel TDX quote">
            <span className="text-success">verified · {a.quoteVerifier}</span>
          </Row>
        ) : null}
        {a.provider ? (
          <Row label="Provider">
            <AddrLink addr={a.provider} />
          </Row>
        ) : null}
        {a.teeSigner ? (
          <Row label="TEE signer">
            <span className="inline-flex items-center gap-1">
              <AddrLink addr={a.teeSigner} />
              {a.providerAcknowledged ? <ShieldCheck className="size-3 text-success" /> : null}
            </span>
          </Row>
        ) : null}
        {a.requestId ? (
          <Row label="Request">
            <span className="tnum">{a.requestId.slice(0, 10)}…</span>
          </Row>
        ) : null}
      </div>
      {status === "simulated" ? (
        <p className="border-t pt-1.5 text-warning/90">Simulated · no TEE proof (0G key not set).</p>
      ) : null}
      <div className="border-t pt-1.5">
        <span className="text-muted-foreground">0G output digest</span>
        <div className="tnum break-all text-muted-foreground/80">{a.hash}</div>
      </div>
    </div>
  );
}

/** Status chip; click to reveal the full attestation detail. */
export function AttestationBadge({ attestation, className }: { attestation: Attestation; className?: string }) {
  const { label, tone, Icon } = BADGE[statusOf(attestation)];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge variant="outline" className={cn("cursor-pointer gap-1", tone, className)}>
          <Icon className="size-3" />
          {label}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-[18rem]">
        <AttestationDetail attestation={attestation} />
      </PopoverContent>
    </Popover>
  );
}
