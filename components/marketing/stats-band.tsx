import Image from "next/image";
import {
  Camera,
  Fish,
  Images,
  Map,
  MapPin,
  RefreshCw,
  Search,
  User,
  Zap,
} from "lucide-react";

const STEPS = [
  {
    n: 1,
    title: "Sign in",
    desc: "One tap proves you're a real, unique human.",
  },
  {
    n: 2,
    title: "Snap a quest",
    desc: "A tamper-proof AI check on every photo.",
  },
  {
    n: 3,
    title: "Level up & get paid",
    desc: "Climb live leaderboards and earn USDC from Level 5.",
  },
];

const CHIPS = ["Fish", "Jelly", "Crab", "Plant"];

/**
 * Screen 2 — a statement card over a reef photo with the killer bounty stat,
 * followed by a two-column "How it works" section with a floating phone mockup.
 */
export function StatsBand() {
  return (
    <section className="py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-10">
        {/* (a) Statement card with reef photo background */}
        <div className="relative min-h-[16rem] overflow-hidden rounded-3xl">
          <Image
            src="/animals/reef2.jpg"
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1100px"
          />
          <div className="absolute inset-0 bg-black/60" />

          <div className="relative z-10 flex flex-col justify-between gap-8 p-8 text-white lg:flex-row lg:items-end lg:p-12">
            <p className="max-w-xl text-2xl font-semibold leading-snug lg:text-3xl">
              Real people, verified species, and biodiversity data researchers
              can finally trust.
            </p>

            <div>
              <div className="tnum text-4xl font-bold tracking-tight lg:text-5xl">
                &gt;195,000
              </div>
              <p className="mt-1 max-w-[16rem] text-sm text-white/70">
                invasive lionfish already removed through paid bounty programs —
                incentivised coastal monitoring works.
              </p>
            </div>
          </div>
        </div>

        {/* (b) How it works — two-column with a floating phone mockup */}
        <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
          {/* LEFT — heading + steps */}
          <div>
            <h2
              className="text-3xl font-bold tracking-tight lg:text-5xl"
              style={{ color: "#FF6F61" }}
            >
              How it works
            </h2>

            <div className="mt-8 space-y-6">
              {STEPS.map((step) => (
                <div key={step.n} className="flex gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FF6F61]/12 font-semibold text-[#FF6F61]">
                    {step.n}
                  </div>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — floating phone mockup */}
          <div className="mx-auto">
            <div className="mx-auto w-[260px] rounded-[2.5rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
              <div className="relative overflow-hidden rounded-[2rem] bg-[#0a1017] text-white">
                {/* notch */}
                <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-neutral-900" />

                <div className="space-y-3 p-4 pt-7 text-xs">
                  {/* 1. Top bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-full bg-primary text-[10px] font-semibold">
                        NA
                      </div>
                      <span className="flex items-center gap-1 text-white/70">
                        <MapPin className="size-3" />
                        Cascais, PT
                      </span>
                    </div>
                    <RefreshCw className="size-3.5 text-white/50" />
                  </div>

                  {/* 2. Level card */}
                  <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                    <div>
                      <div className="text-white/50">Your level</div>
                      <div className="text-base font-semibold">Level 4</div>
                    </div>
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Zap className="size-4" />
                    </div>
                  </div>

                  {/* 3. Species chips */}
                  <div className="flex gap-2">
                    {CHIPS.map((chip, i) => (
                      <div
                        key={chip}
                        className={
                          i === 0
                            ? "flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-primary-foreground"
                            : "flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-white/70"
                        }
                      >
                        <Fish className="size-3" />
                        {chip}
                      </div>
                    ))}
                  </div>

                  {/* 4. Search field */}
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-white/50 ring-1 ring-white/10">
                    <Search className="size-3.5" />
                    Find a sighting
                  </div>

                  {/* 5. Mini map */}
                  <div>
                    <div className="text-white/50">Nearby sightings</div>
                    <div className="relative mt-1 h-24 rounded-xl bg-gradient-to-br from-[#0e1a26] to-[#0a1017] ring-1 ring-white/10">
                      <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F0506E] ring-2 ring-white/70" />
                    </div>
                  </div>

                  {/* 6. Nearby card */}
                  <div className="flex items-center gap-2 rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
                    <div className="relative size-10 overflow-hidden rounded-lg bg-white/10">
                      <Image
                        src="/animals/qualle.png"
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-medium">Compass jellyfish</div>
                      <div className="text-white/50">Carcavelos · 2 min ago</div>
                    </div>
                    <div className="ml-auto size-2.5 rounded-full bg-[#F0506E]" />
                  </div>

                  {/* 7. Bottom nav */}
                  <div className="flex items-center justify-between pt-1 text-white/40">
                    <Zap className="size-4" />
                    <Map className="size-4" />
                    <div className="-mt-2 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Camera className="size-4" />
                    </div>
                    <Images className="size-4" />
                    <User className="size-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
