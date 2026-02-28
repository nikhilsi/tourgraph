import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.tripadvisor.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
