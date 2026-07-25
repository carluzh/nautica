import type { Metadata } from "next";
import { AppShowcase } from "@/components/marketing/app-showcase";
import { StatsBand } from "@/components/marketing/stats-band";
import { Solution } from "@/components/marketing/solution";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  title: "Nautica · citizen science, leveled up",
  description:
    "Nautica is a citizen-science game. Complete daily nature-photo quests, earn XP, and level up. World ID and 0G make every record verifiable enough for researchers to fund.",
};

export default function MarketingPage() {
  return (
    <div className="relative overflow-x-clip">
      <main>
        <AppShowcase />
        <StatsBand />
        <Solution />
      </main>

      <SiteFooter />
    </div>
  );
}
