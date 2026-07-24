"use client";

import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Attestation } from "@/lib/game/types";

/** "0G verified" chip. Hover reveals the TEE attestation (model, confidence, hash). */
export function AttestationBadge({
  attestation,
  className,
}: {
  attestation: Attestation;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("gap-1 border-success/30 text-success", className)}>
          <ShieldCheck className="size-3" />
          0G verified
        </Badge>
      </TooltipTrigger>
      {/* Render on the popover surface (not the default inverted bg-foreground
          tooltip) so foreground / muted / success / destructive tokens read
          correctly; recolor the caret to match the popover fill. */}
      <TooltipContent className="max-w-[16rem] border bg-popover text-popover-foreground shadow-md [&_svg]:bg-popover [&_svg]:fill-popover">
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium text-foreground">TEE attestation</span>
            <span
              className={cn(
                "font-medium",
                attestation.verdict === "pass" ? "text-success" : "text-destructive",
              )}
            >
              {attestation.verdict === "pass" ? "Pass" : "Fail"}
            </span>
          </div>
          {attestation.label ? (
            <p className="text-muted-foreground italic">“{attestation.label}”</p>
          ) : null}
          <div className="space-y-1 border-t pt-1.5">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Model</span>
              <span className="tnum">{attestation.model}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Confidence</span>
              <span className="tnum">{Math.round(attestation.confidence * 100)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Enclave</span>
              <span>{attestation.tee}</span>
            </div>
          </div>
          <div className="tnum break-all text-muted-foreground/80">{attestation.hash}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
