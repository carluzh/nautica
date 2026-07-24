import { cn } from "@/lib/utils";

/**
 * Nautica mark — a signal-flag / depth-sounding grid. Rendered with
 * currentColor so it inherits text color (teal in most placements). The
 * per-dot opacities from the source art are preserved via stroke-opacity.
 */
export function NauticaLogo({
  className,
  size = 30,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary", className)}
      aria-hidden="true"
    >
      <g fill="none" strokeLinejoin="miter" strokeLinecap="square" stroke="currentColor" strokeWidth={4}>
        <path d="M3 11H3.01" />
        <path d="M3 15H3.01" />
        <path d="M3 19H3.01" />
        <path d="M3 23H3.01" />
        <path d="M7 7H7.01" />
        <path d="M7 11H7.01" strokeOpacity={0.25} />
        <path d="M7 15H7.01" strokeOpacity={0.25} />
        <path d="M7 23H7.01" strokeOpacity={0.25} />
        <path d="M7 27H7.01" />
        <path d="M11 15H11.01" />
        <path d="M7 19H7.01" strokeOpacity={0.25} />
        <path d="M11 19H11.01" strokeOpacity={0.25} />
        <path d="M15 23H15.01" strokeOpacity={0.25} />
        <path d="M11 23H11.01" />
        <path d="M15 27H15.01" />
        <path d="M19 15H19.01" />
        <path d="M19 23H19.01" />
        <path d="M23 7H23.01" />
        <path d="M11 3H11.01" />
        <path d="M15 3H15.01" />
        <path d="M19 3H19.01" />
        <path d="M23 27H23.01" />
        <path d="M27 11H27.01" />
        <path d="M27 15H27.01" />
        <path d="M27 19H27.01" />
        <path d="M27 23H27.01" />
      </g>
    </svg>
  );
}
