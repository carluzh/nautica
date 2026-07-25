import Image from "next/image";

/**
 * Screen 2 — a statement card plus two killer stat boxes, with a large
 * jellyfish overlapping the black statement box from the bottom-left.
 */
export function StatsBand() {
  return (
    <section className="py-14 lg:py-20">
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Statement + two killer stats — three boxes */}
        <div className="grid items-stretch gap-4 lg:grid-cols-4">
          {/* LEFT — black statement card, with the jellyfish overlapping it */}
          <div className="relative lg:col-span-2">
            <div className="flex h-full items-center rounded-3xl bg-[#0a1017] p-8 text-white lg:p-12">
              <p className="text-2xl font-semibold leading-snug lg:text-3xl">
                Real people, verified species, and biodiversity data researchers
                can finally trust.
              </p>
            </div>

            <Image
              src="/animals/qualle.png"
              alt=""
              width={1001}
              height={1121}
              sizes="380px"
              className="nautica-jelly pointer-events-auto absolute -bottom-16 -left-6 z-20 w-56 select-none lg:w-72"
            />
          </div>

          {/* MIDDLE — sightings stat over a reef photo */}
          <div className="relative overflow-hidden rounded-3xl lg:col-span-1">
            <Image
              src="/animals/reef3.jpg"
              alt=""
              fill
              sizes="(max-width:1024px) 100vw, 360px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/60" />

            <div className="relative z-10 flex flex-col justify-center p-8 text-white">
              <div className="tnum text-4xl font-bold tracking-tight lg:text-5xl">
                33,519
              </div>
              <p className="mt-1 text-sm text-white/70">
                sightings logged this season
              </p>
            </div>
          </div>

          {/* RIGHT — lionfish bounty stat over a reef photo */}
          <div className="relative overflow-hidden rounded-3xl lg:col-span-1">
            <Image
              src="/animals/reef2.jpg"
              alt=""
              fill
              sizes="(max-width:1024px) 100vw, 360px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/60" />

            <div className="relative z-10 flex flex-col justify-center p-8 text-white">
              <div className="tnum text-4xl font-bold tracking-tight lg:text-5xl">
                &gt;195,000
              </div>
              <p className="mt-1 text-sm text-white/70">
                invasive lionfish removed through paid bounty programs —
                incentivised coastal monitoring works.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
