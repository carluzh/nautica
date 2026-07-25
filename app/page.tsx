import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  Fingerprint,
  Fish,
  FlaskConical,
  Gamepad2,
  Lock,
  ShieldCheck,
  TrendingDown,
  Trophy,
  Users,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteNav } from "@/components/marketing/site-nav";
import { Hero } from "@/components/marketing/hero";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  title: "Nautica · citizen science, leveled up",
  description:
    "Nautica is a citizen-science game. Complete daily nature-photo quests, earn XP, and level up. World ID and 0G make every record verifiable enough for researchers to fund.",
};

type Icon = ComponentType<{ className?: string }>;

const STEPS: { n: string; icon: Icon; title: string; body: string }[] = [
  {
    n: "01",
    icon: Fingerprint,
    title: "Sign in with World ID",
    body: "One tap proves you are a real, unique human. No wallet setup, no KYC. Pick a tier: Face to play, Passport and Orb to get paid.",
  },
  {
    n: "02",
    icon: Camera,
    title: "Complete daily photo quests",
    body: "Three free quests a day. Photograph a crab, a shore plant, a jellyfish. Snap it, submit it, done in under a minute.",
  },
  {
    n: "03",
    icon: ShieldCheck,
    title: "0G verifies every shot",
    body: "0G runs a TEE-attested vision model on each photo and returns a tamper-proof attestation. Real proof of quality, not trust-our-server.",
  },
  {
    n: "04",
    icon: Trophy,
    title: "Earn XP and level up",
    body: "Every verified shot earns XP. Reach Level 5 to unlock paid research quests that settle in USDC on Base.",
  },
];

const STATS: { icon: Icon; value: string; label: string; note: string }[] = [
  {
    icon: Waves,
    value: ">12,300",
    label: "jellyfish reports logged by GelAvista volunteers in Portugal",
    note: "Citizen science at scale",
  },
  {
    icon: Fish,
    value: ">195,000",
    label: "invasive lionfish removed through bounty programs",
    note: "Incentives change behavior",
  },
  {
    icon: Users,
    value: "~43",
    label: "people employed full-time by Shark Spotters in Cape Town",
    note: "Spotting as a livelihood",
  },
  {
    icon: TrendingDown,
    value: "€422M",
    label: "modeled yearly welfare loss from Catalonia jellyfish blooms",
    note: "Model estimate",
  },
];

const PARTNER_POINTS = [
  "World ID proof-of-humanity on every record",
  "0G TEE attestation per photo",
  "GBIF-compatible open export",
];

export default function MarketingPage() {
  return (
    <div className="relative">
      <SiteNav />

      <main>
        {/* ---- Hero -------------------------------------------------------- */}
        <Hero />

        {/* ---- How it works (light band) ---------------------------------- */}
        <section
          id="how"
          className="theme-light scroll-mt-20 border-t border-border bg-background text-foreground"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">How it works</p>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                From a daily photo to data science can trust.
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                One loop turns a single snapshot into XP for you and a verified,
                research-grade record for everyone else. Two separate systems keep
                it honest: XP levels gate the paid unlock, World ID tiers gate the
                payouts.
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

        {/* ---- Two sides (dark) ------------------------------------------- */}
        <section id="sides" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">Two sides, one photo</p>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Play the game, or fund the science.
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                The same verified shot is a trophy in your field gallery and a
                research-grade record in a partner&apos;s dataset. One
                contribution, two payoffs.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {/* Players */}
              <Card className="relative gap-5 overflow-hidden border-primary/25 px-6">
                <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Gamepad2 className="size-5" />
                  </span>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Players
                  </span>
                </div>
                <div className="relative">
                  <h3 className="text-2xl font-semibold tracking-tight">Play the field</h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    Complete daily quests, build a verified field gallery of
                    everything you have found, and climb the leaderboard. Reach
                    Level 5 and your photos start paying out in USDC on Base.
                  </p>
                </div>
                <PlayerPreview />
                <Link
                  href="/app"
                  className="group relative inline-flex items-center gap-1.5 text-sm font-medium text-primary"
                >
                  Open the app
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Card>

              {/* Research partners */}
              <Card className="relative gap-5 overflow-hidden px-6">
                <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-chart-2/10 blur-3xl" />
                <div className="relative flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                    <FlaskConical className="size-5" />
                  </span>
                  <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    Research partners
                  </span>
                </div>
                <div className="relative">
                  <h3 className="text-2xl font-semibold tracking-tight">Fund the science</h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    Define a quest spec and verified humans go collect it. Every
                    record returns with World ID provenance and a 0G attestation,
                    exported GBIF-compatible. Provenance you can audit, not just
                    trust.
                  </p>
                </div>
                <ul className="relative space-y-3">
                  {PARTNER_POINTS.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm">
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pro"
                  className="group relative inline-flex items-center gap-1.5 text-sm font-medium text-primary"
                >
                  For researchers
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Card>
            </div>
          </div>
        </section>

        {/* ---- Stats strip (light band) ----------------------------------- */}
        <section
          id="data"
          className="theme-light scroll-mt-20 border-y border-border bg-background text-foreground"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">Why it works</p>
              <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Incentivised citizen science already works.
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Nautica did not invent paying people to watch the coast. It makes
                the proof verifiable, so the data is finally worth funding.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STATS.map((stat) => {
                const StatIcon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-xl border bg-card p-6 shadow-sm"
                  >
                    <StatIcon className="size-5 text-primary" />
                    <div className="tnum mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                      {stat.value}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-3 text-xs font-medium text-muted-foreground/70">
                      {stat.note}
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Pay verified humans to document nature, prove each contribution with
              World ID and 0G, and you get a biodiversity dataset researchers can
              actually fund. That is the whole game.
            </p>
          </div>
        </section>

        {/* ---- Closing CTA (dark) ----------------------------------------- */}
        <section className="relative">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card px-6 py-16 text-center sm:px-12 sm:py-20">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[520px] max-w-full -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/15 blur-[120px]" />
              <h2 className="relative mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
                Your first quest is waiting.
              </h2>
              <p className="relative mx-auto mt-5 max-w-xl text-base text-muted-foreground">
                Sign in with World ID, photograph what is around you, and start
                turning nature into verified data. Level up from there.
              </p>
              <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="group w-full sm:w-auto">
                  <Link href="/app">
                    Open the app
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Link href="/pro">For researchers</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

// Compact, clearly-illustrative progression card used inside the players value
// card. Mirrors the in-app level bar and quest rewards.
function PlayerPreview() {
  return (
    <div className="relative rounded-lg border bg-background/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Trophy className="size-3 text-primary" />
          Level 4
        </span>
        <span className="tnum text-[11px] text-muted-foreground">22 XP to Level 5</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[70%] rounded-full bg-primary" />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Next unlock ·{" "}
        <span className="font-medium text-foreground">paid research quests</span>
      </p>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between rounded-md border bg-secondary/40 px-2.5 py-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            <BadgeCheck className="size-3.5 text-success" />
            Photograph a crab
          </span>
          <span className="tnum text-xs font-semibold text-primary">+5 XP</span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <Lock className="size-3.5" />
            Lionfish survey · L5
          </span>
          <span className="tnum text-xs font-semibold text-primary">+6 USDC</span>
        </div>
      </div>
    </div>
  );
}
