import Image from "next/image";
import { REAL_SIGHTINGS } from "@/sightings";

export function StatsBand() {
  return (
    <section className="pb-0 pt-0">
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Inter-box gap matches the hero's bottom margin above; section has no top
            padding so the gap to the hero equals the gap between boxes. */}
        <div className="grid items-stretch gap-4 sm:gap-6 lg:grid-cols-4 lg:gap-8 [&>div]:min-h-[14rem] lg:[&>div]:min-h-[16rem]">
          <div className="relative lg:col-span-2">
            <div className="flex h-full flex-col justify-between gap-6 rounded-3xl bg-[#0a1017] p-8 text-white lg:p-12">
              <p className="text-2xl font-semibold leading-snug lg:text-3xl">
                Verified species and biodiversity data researchers can leverage
              </p>
              <p className="self-end text-right text-2xl font-semibold leading-snug text-[#FF6F61] lg:text-3xl">
                ... by real people.
              </p>
            </div>

            <Image
              src="/animals/qualle.png"
              alt=""
              width={1001}
              height={1121}
              sizes="380px"
              className="nautica-jelly pointer-events-none absolute -bottom-72 -left-6 z-20 w-56 select-none lg:w-72"
            />
          </div>

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
              <div className="tnum text-5xl font-bold tracking-tight lg:text-6xl">
                {REAL_SIGHTINGS.length.toLocaleString()}
              </div>
              <p className="mt-1 text-sm font-medium text-white/80">
                community sightings on the live map
              </p>
            </div>
          </div>

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
              <div className="tnum text-5xl font-bold tracking-tight lg:text-6xl">
                100%
              </div>
              <p className="mt-1 text-sm font-medium text-white/80">
                of records carry World ID proof and a 0G attestation - open,
                auditable biodiversity data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
