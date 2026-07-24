// Nautica for research partners. The partner side of the game: fund
// citizen-science photo quests and get World ID + 0G-attested,
// GBIF-compatible data back. A rewards game for verified humans, not a
// financial product.
import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Coins,
  Download,
  Fingerprint,
  Globe,
  ListChecks,
  Share2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteFooter } from "@/components/site/site-footer";
import { ProWaitlist } from "@/components/marketing/pro-waitlist";

export const metadata: Metadata = {
  title: "Nautica for research partners",
  description:
    "Fund citizen-science photo quests and receive World ID + 0G-verified, GBIF-compatible biodiversity data.",
};

type Icon = ComponentType<{ className?: string }>;

const CHIPS: { icon: Icon; label: string }[] = [
  { icon: Fingerprint, label: "World ID" },
  { icon: ShieldCheck, label: "0G attested" },
  { icon: Globe, label: "GBIF-compatible" },
  { icon: Coins, label: "USDC on Base" },
];

const STEPS: { n: string; icon: Icon; title: string; body: string }[] = [
  {
    n: "01",
    icon: ListChecks,
    title: "Define a quest spec",
    body: "Set the species, the views you need (dorsal, ventral), counts, a size reference, and any metadata. You write the requirements.",
  },
  {
    n: "02",
    icon: Users,
    title: "Verified humans submit",
    body: "The quest reaches players in-app. World ID gates every contributor to one real person, with Passport and Orb tiers for anyone you pay.",
  },
  {
    n: "03",
    icon: ShieldCheck,
    title: "0G checks against your spec",
    body: "Each submission is scored by a TEE-attested vision model against your spec, returning a tamper-proof attestation. Off-spec shots never reach you.",
  },
  {
    n: "04",
    icon: Download,
    title: "Export the dataset",
    body: "Pull GBIF-compatible records, each carrying its proof-of-humanity and attestation. Pay per accepted record in USDC on Base.",
  },
];

const COMPARE: { typical: string; nautica: string }[] = [
  {
    typical: "Anonymous uploads, easy to sybil-farm",
    nautica: "World ID: one real, unique human per contributor",
  },
  {
    typical: "Quality is trust-our-server",
    nautica: "0G TEE attestation on every photo",
  },
  {
    typical: "Provenance you cannot audit",
    nautica: "Provenance you can verify independently",
  },
  {
    typical: "Bespoke or closed exports",
    nautica: "GBIF-compatible open export, no lock-in",
  },
];

const STACK: { icon: Icon; name: string; role: string }[] = [
  { icon: Fingerprint, name: "World ID", role: "Proof of unique humanity" },
  { icon: ShieldCheck, name: "0G", role: "Verifiable TEE-attested AI" },
  { icon: Share2, name: "The Graph", role: "Leaderboards and dashboards" },
  { icon: Coins, name: "Base", role: "USDC payouts per record" },
];

export default function ProPage() {
  return (
    <div className="relative">
      {/* ---- Header ------------------------------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark href="/" size={26} className="text-[15px]" />
          <div className="flex items-center gap-4">
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
              For research partners
            </span>
            <Button asChild size="sm" className="group">
              <Link href="/app">
                Open the app
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* ---- Hero -------------------------------------------------------- */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[720px] max-w-full -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/15 blur-[130px]" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-primary">Nautica for research partners</p>
              <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                Fund citizen-science quests.{" "}
                <span className="text-primary">Get data you can trust.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                Define what you need photographed. Verified humans go collect it.
                Every record comes back with World ID provenance and a 0G TEE
                attestation, exported GBIF-compatible. Provenance you can audit,
                not just trust.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="group w-full sm:w-auto">
                  <Link href="#waitlist">
                    Join the partner waitlist
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Link href="/app">See the player app</Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {CHIPS.map((chip) => {
                  const ChipIcon = chip.icon;
                  return (
                    <span
                      key={chip.label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm"
                    >
                      <ChipIcon className="size-3.5 text-primary" />
                      {chip.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ---- How it works for partners ---------------------------------- */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">How it works for partners</p>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                From a quest spec to a verified dataset.
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                You write the requirements, the game does the collection, and 0G
                does the checking. You only ever see records that already match.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step) => {
                const StepIcon = step.icon;
                return (
                  <Card
                    key={step.n}
                    className="gap-4 px-6 transition hover:-translate-y-0.5 hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="tnum text-sm font-semibold text-primary">
                        {step.n}
                      </span>
                      <StepIcon className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---- Why partners trust it -------------------------------------- */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">Why partners trust it</p>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Proof of humanity plus attestation beats typical provenance.
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Citizen science always carries noise. What a normal app cannot
                give you is a per-record proof that the contributor was a unique
                human and the photo was actually checked.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {/* Typical */}
              <Card className="gap-5 px-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <X className="size-5" />
                  </span>
                  <h3 className="text-lg font-semibold text-muted-foreground">
                    Typical citizen-science app
                  </h3>
                </div>
                <ul className="space-y-3">
                  {COMPARE.map((row) => (
                    <li key={row.typical} className="flex items-start gap-2.5 text-sm">
                      <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
                      <span className="text-muted-foreground">{row.typical}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Nautica */}
              <Card className="relative gap-5 overflow-hidden border-primary/30 px-6">
                <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <ShieldCheck className="size-5" />
                  </span>
                  <h3 className="text-lg font-semibold">Nautica</h3>
                </div>
                <ul className="relative space-y-3">
                  {COMPARE.map((row) => (
                    <li key={row.nautica} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-foreground">{row.nautica}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Stack strip */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STACK.map((item) => {
                const StackIcon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 rounded-xl border bg-card/50 p-4"
                  >
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                      <StackIcon className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.role}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---- Waitlist CTA ----------------------------------------------- */}
        <section id="waitlist" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card px-6 py-14 sm:px-12 sm:py-16">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-[520px] max-w-full -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/15 blur-[120px]" />
              <div className="relative mx-auto max-w-xl text-center">
                <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  Put a quest in the field.
                </h2>
                <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
                  Tell us what you need documented and where. We will scope a pilot
                  quest with you and seed a partner treasury for payouts.
                </p>
                <div className="mx-auto mt-8 max-w-md text-left">
                  <ProWaitlist />
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Prototype built at ETHGlobal Lisbon. No spam, just a pilot
                    conversation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
