"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SpeciesBadge } from "@/components/app/species-badge";
import { SPECIES_META } from "@/lib/game/content";
import { useGame } from "@/lib/game/provider";
import type { SpeciesId } from "@/lib/game/types";

const SPECIES_IDS = Object.keys(SPECIES_META) as SpeciesId[];

/** Research-institute "post a quest" form. Collects the create-endpoint fields and
 *  posts via useGame().createQuest; the server escrows the reward in USDC on Base. */
export function PartnerQuestDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { createQuest } = useGame();

  const [title, setTitle] = useState("");
  const [species, setSpecies] = useState<SpeciesId>("Lionfish");
  const [spec, setSpec] = useState("");
  const [requirements, setRequirements] = useState("");
  const [reward, setReward] = useState("40");
  const [usdc, setUsdc] = useState("6");
  const [funding, setFunding] = useState("60");
  const [partner, setPartner] = useState("");
  const [busy, setBusy] = useState(false);

  const usdcN = Number(usdc) || 0;
  const fundingN = Number(funding) || 0;
  const rewardN = Number(reward) || 0;
  const isPaid = usdcN > 0;
  const underfunded = isPaid && fundingN < usdcN;
  const canSubmit =
    !busy && title.trim().length >= 3 && spec.trim().length >= 3 && partner.trim().length >= 2 && rewardN >= 1 && !underfunded;

  function reset() {
    setTitle("");
    setSpecies("Lionfish");
    setSpec("");
    setRequirements("");
    setReward("40");
    setUsdc("6");
    setFunding("60");
    setPartner("");
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    const res = await createQuest({
      title: title.trim(),
      species,
      spec: spec.trim(),
      requirements: requirements
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
      reward: rewardN,
      usdc: usdcN,
      funding: isPaid ? fundingN : 0,
      partner: partner.trim(),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Quest posted", {
        description: res.simulated
          ? "Simulated (no chain configured)."
          : `Escrowed $${isPaid ? fundingN : 0} · tx ${res.txHash?.slice(0, 10)}…`,
      });
      reset();
      onOpenChange(false);
    } else {
      toast.error(res.reason);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post a research quest</DialogTitle>
          <DialogDescription>
            Fund a citizen-science photo quest. Reward escrows in USDC on Base.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pq-title">Title</Label>
            <Input
              id="pq-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lionfish removal survey"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pq-species">Species</Label>
            <Select value={species} onValueChange={(v) => setSpecies(v as SpeciesId)}>
              <SelectTrigger id="pq-species" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPECIES_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    <SpeciesBadge species={id} className="size-4" />
                    {SPECIES_META[id].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pq-spec">Photo spec</Label>
            <Textarea
              id="pq-spec"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="What a valid photo must show, for the 0G check."
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pq-req">Requirements</Label>
            <Input
              id="pq-req"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Dorsal view, Ventral view, Size reference"
            />
            <p className="text-[11px] text-muted-foreground">Comma-separated. Optional.</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pq-reward">XP</Label>
              <Input
                id="pq-reward"
                type="number"
                min={1}
                value={reward}
                onChange={(e) => setReward(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pq-usdc">USDC / photo</Label>
              <Input
                id="pq-usdc"
                type="number"
                min={0}
                value={usdc}
                onChange={(e) => setUsdc(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pq-funding">Fund (USDC)</Label>
              <Input
                id="pq-funding"
                type="number"
                min={0}
                value={isPaid ? funding : "0"}
                disabled={!isPaid}
                onChange={(e) => setFunding(e.target.value)}
              />
            </div>
          </div>
          {!isPaid ? (
            <p className="-mt-2 text-[11px] text-muted-foreground">Free quest. No USDC required.</p>
          ) : underfunded ? (
            <p className="-mt-2 text-[11px] text-warning">
              Funding must cover at least one reward (${usdcN}).
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pq-partner">Institute</Label>
            <Input
              id="pq-partner"
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              placeholder="MARE · Marine Sciences Institute"
            />
          </div>

          <Button className="w-full" disabled={!canSubmit} onClick={submit}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Posting…
              </>
            ) : (
              "Post quest"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
