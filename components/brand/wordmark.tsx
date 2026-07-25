import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  href = "/",
  size = 24,
}: {
  className?: string;
  href?: string | null;
  size?: number;
}) {
  const inner = (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      {/* Coral brand mark (public/logo.png) tinted via CSS mask — same treatment
          as the in-app sidebar so the wordmark is consistent everywhere. */}
      <span
        role="img"
        aria-label="Nautica"
        className="inline-block shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: "#FF6F61",
          maskImage: "url(/logo.png)",
          WebkitMaskImage: "url(/logo.png)",
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
      <span className="text-[0.95em]">Nautica</span>
    </span>
  );
  if (href === null) return inner;
  return (
    <Link href={href} className="inline-flex items-center transition-opacity hover:opacity-80">
      {inner}
    </Link>
  );
}
