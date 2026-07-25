import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Plus Jakarta Sans — a warm, rounded, geometric humanist sans. Friendly and
// approachable (Airbnb-adjacent), not techy.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nautica — citizen science, leveled up",
  description:
    "Play daily nature-photo quests, earn XP, and level up. World ID and 0G make every record verifiable enough for researchers to fund.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Light by default (palette lives in globals.css :root). Dark bands opt in
  // with `.theme-dark`.
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
