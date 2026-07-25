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
  title: "nautica",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Light everywhere (palette lives in globals.css :root). There is no dark theme.
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
