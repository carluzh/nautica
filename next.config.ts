import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sighting photos and species imagery may come from a range of hosts during
  // the hackathon; keep remote images permissive for now.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // No ESLint config in the repo, so skip lint during `next build` (it fails in CI
  // with no config). Type-checking still runs and gates the build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
