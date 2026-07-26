import type { Metadata } from "next";
import { AppShowcase } from "@/components/marketing/app-showcase";
import { StatsBand } from "@/components/marketing/stats-band";
import { Solution } from "@/components/marketing/solution";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  title: "Nautica · citizen science, leveled up",
  description:
    "Nautica is a citizen-science game. Sign in as a guest or with email, complete daily nature-photo quests, earn XP, and level up. 0G verification makes every record auditable enough for researchers to fund.",
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
