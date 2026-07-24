import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sighting photos and species imagery may come from a range of hosts during
  // the hackathon; keep remote images permissive for now.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
