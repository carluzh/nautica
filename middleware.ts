import { NextResponse, type NextRequest } from "next/server";

/**
 * Subdomain routing: `pro.<domain>` serves the /pro prediction-market app,
 * while the apex domain serves marketing (/) and the field app (/app).
 * Locally this is a no-op (no `pro.` host), so `npm run build && start` shows
 * /pro at the /pro path; in production point pro.<domain> at this app.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;

  if (host.startsWith("pro.") && !pathname.startsWith("/pro")) {
    const url = req.nextUrl.clone();
    url.pathname = `/pro${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
