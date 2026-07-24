import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Nautica — verified marine intelligence",
  description:
    "Nautica pays people to report what is happening in the ocean, and turns verified sightings into live prediction markets for coastal risk.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // .dark keeps shadcn `dark:` variants live; the palette itself is dark by
  // default (see globals.css), so the app is dark with no theme JS.
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrains.variable}`}>
      <body>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="top-center" />
        <div aria-hidden className="grain-overlay" />
      </body>
    </html>
  );
}
