"use client";

// Real World ID 4.0 widget. Browser-only (loaded via next/dynamic ssr:false) so
// IDKit's WASM never runs during SSR. Opens IDKit with the credential's preset.

import {
  IDKitRequestWidget,
  identityCheck,
  orbLegacy,
  selfieCheckLegacy,
  type Preset,
} from "@worldcoin/idkit";
import type { WorldContext } from "@/lib/api/client";
import type { VerifyStep } from "@/lib/game/types";

type Props = {
  ctx: WorldContext;
  credential: VerifyStep;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (result: unknown) => void | Promise<void>;
  onError?: (code: string) => void;
};

function presetFor(credential: VerifyStep): Preset {
  switch (credential) {
    case "orb":
      return orbLegacy();
    case "passport":
      return identityCheck({ attributes: [{ type: "minimum_age", value: 18 }] });
    default:
      return selfieCheckLegacy();
  }
}

export function WorldIdWidget({ ctx, credential, open, onOpenChange, onResult, onError }: Props) {
  return (
    <IDKitRequestWidget
      app_id={ctx.app_id as `app_${string}`}
      action={ctx.action}
      rp_context={ctx.rp_context}
      allow_legacy_proofs={ctx.allow_legacy_proofs}
      preset={presetFor(credential)}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={(result) => onResult(result)}
      onError={(code) => onError?.(String(code))}
    />
  );
}
