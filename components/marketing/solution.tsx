import Image from "next/image";
import { cn } from "@/lib/utils";

export function Solution() {
  return (
    <section id="how" className="scroll-mt-20 pb-14 pt-4 sm:pt-6 lg:pb-20 lg:pt-8">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-4 lg:gap-8">
          <div className="relative hidden min-h-[26rem] lg:col-span-2 lg:col-start-1 lg:block">
            <div className="absolute -left-24 bottom-2 h-[22rem] w-[34rem] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/10">
              <Image src="/animals/reef4.jpg" alt="" fill sizes="544px" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/25 to-transparent" />
            </div>
            <Image
              src="/animals/leopardhaineu.png"
              alt=""
              width={1366}
              height={768}
              sizes="480px"
              className="absolute bottom-[7rem] left-[24%] w-[30rem] -rotate-6 select-none drop-shadow-2xl"
            />
            <ReefPolaroid src="/animals/nudibranch.jpg" className="right-[6%] top-[6%] rotate-3" />
            <ReefPolaroid
              src="/animals/rainbowwrasse.png"
              contain
              bg="bg-gradient-to-b from-sky-500 to-cyan-800"
              className="bottom-[1rem] left-[68%] -rotate-6"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:col-span-2 lg:col-start-3 lg:gap-8">
            <div className="rounded-3xl border border-border bg-card p-6 lg:p-8">
              <p className="text-sm font-bold text-[#FF6F61]">
                For citizen scientists
              </p>
              <h3 className="mt-1 text-xl font-semibold">
                Explore, log, get rewarded
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Turn a beach walk or a dive into something that counts. Log what
                you find, build a verified field gallery, climb the leaderboard,
                and earn USDC from Level 5.
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 lg:p-8">
              <p className="text-sm font-bold text-[#FF6F61]">
                For researchers, agencies &amp; NGOs
              </p>
              <h3 className="mt-1 text-xl font-semibold">Data you can act on</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Post a quest and verified people go collect it. Every record
                arrives with World ID and 0G provenance, GBIF-ready - biodiversity
                data you can audit, act on, and fund.
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-3xl bg-[#0a1017] p-5 ring-1 ring-[#FF6F61]/20">
              <LogoBadge src="/0g-logo.png" alt="0G" />
              <div>
                <p className="font-semibold text-white">AI photo ID</p>
                <p className="mt-0.5 text-sm text-white/60">
                  An AI model names the species and signs a tamper-proof 0G check
                  on every photo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-3xl bg-[#0a1017] p-5 ring-1 ring-[#FF6F61]/20">
              <LogoBadge src="/worldcoin-logo.png" alt="World ID" />
              <div>
                <p className="font-semibold text-white">Verified real human</p>
                <p className="mt-0.5 text-sm text-white/60">
                  World ID proves every contributor is a unique, real person - no
                  bots, no wallet, no KYC.
                </p>
              </div>
            </div>

            {/* sm:col-span-2 - full-width banner below the two proof pillars. */}
            <div className="flex items-center gap-4 rounded-3xl bg-[#0a1017] p-5 ring-1 ring-[#FF6F61]/20 sm:col-span-2">
              <LogoBadge src="/thegraph-logo.png" alt="The Graph" />
              <div>
                <p className="font-semibold text-white">Indexed on The Graph</p>
                <p className="mt-0.5 text-sm text-white/60">
                  A custom subgraph indexes every on-chain quest, USDC escrow, and
                  species stat on Base Sepolia - so the app reads live biodiversity
                  and reward data in milliseconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// White disc backs the transparent-PNG marks so they read on the dark banners.
function LogoBadge({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white">
      <span className="relative size-7">
        <Image src={src} alt={alt} fill sizes="28px" className="object-contain" />
      </span>
    </span>
  );
}

function ReefPolaroid({
  src,
  className,
  contain,
  bg,
}: {
  src: string;
  className?: string;
  contain?: boolean;
  bg?: string;
}) {
  return (
    <figure
      className={cn(
        "absolute w-36 rounded-[6px] border border-black/10 bg-stone-300 p-2 pb-6 shadow-xl lg:w-44",
        className,
      )}
    >
      <div className={cn("relative aspect-square w-full overflow-hidden rounded-[3px]", bg ?? "bg-muted")}>
        <Image src={src} alt="" fill sizes="160px" className={contain ? "object-contain p-1.5" : "object-cover"} />
      </div>
      <span className="absolute inset-x-0 bottom-[9px] flex items-center justify-center gap-[3px]">
        {[0, 1, 2].map((d) => (
          <span key={d} className="size-[4px] rounded-full bg-[#4a473f] opacity-75" />
        ))}
      </span>
    </figure>
  );
}
