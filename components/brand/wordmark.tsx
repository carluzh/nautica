import Link from "next/link";
import { cn } from "@/lib/utils";
import { NauticaLogo } from "./nautica-logo";

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
      <NauticaLogo size={size} />
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
