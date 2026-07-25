import { Camera, Fingerprint } from "lucide-react";
import Link from "next/link";
import { SwimmingShark } from "@/components/marketing/swimming-shark";

/**
 * Screen 3 — show the product + close. Two "who it's for" cards, verification
 * banners, a reef-filled CTA, then a thin "Built with" trust row.
 */
export function Solution() {
  return (
    <section id="how" className="scroll-mt-20 py-14 lg:py-20">
      <div className="px-4 sm:px-6 lg:px-8">
        {/* (a) Two sides — who it's for */}
        <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
          {/* LEFT — For citizen scientists */}
          <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
            <p className="text-sm font-medium text-[#FF6F61]">
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

          <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
            <p className="text-sm font-medium text-[#FF6F61]">
              For researchers, agencies &amp; NGOs
            </p>
            <h3 className="mt-1 text-xl font-semibold">Data you can act on</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Post a quest and verified people go collect it. Every record
              arrives with World ID and 0G provenance, GBIF-ready — biodiversity
              data you can audit, act on, and fund.
            </p>
          </div>
        </div>

        {/* (a2) Verification banners — the two proof pillars */}
        <div className="mx-auto mt-6 grid max-w-4xl gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl bg-[#0a1017] p-5 ring-1 ring-[#FF6F61]/20">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FF6F61]/15">
              <Camera className="size-5 text-[#FF6F61]" />
            </span>
            <div>
              <p className="font-semibold text-white">AI photo ID</p>
              <p className="mt-0.5 text-sm text-white/60">
                An AI model names the species and signs a tamper-proof 0G check on
                every photo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-[#0a1017] p-5 ring-1 ring-[#FF6F61]/20">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FF6F61]/15">
              <Fingerprint className="size-5 text-[#FF6F61]" />
            </span>
            <div>
              <p className="font-semibold text-white">Verified real human</p>
              <p className="mt-0.5 text-sm text-white/60">
                World ID proves every contributor is a unique, real person — no
                bots, no wallet, no KYC.
              </p>
            </div>
          </div>
        </div>

        {/* Leopard shark swimming under the two-column cards */}
        <SwimmingShark />

        {/* (b) Reef-filled CTA — straight on the page, no box */}
        <div className="mx-auto mt-12 flex max-w-2xl items-center justify-center py-6 text-center">
          <Link
            href="/app"
            className="text-3xl font-bold lg:text-5xl"
            style={{
              backgroundImage: "url(/animals/reef2.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
            }}
          >
            Log your first sighting →
          </Link>
        </div>

        {/* (c) Thin trust row — last, before the footer */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs">
          <span className="text-muted-foreground">Built with</span>
          {["World ID", "0G", "The Graph"].map((name) => (
            <span
              key={name}
              className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 font-medium text-muted-foreground"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
