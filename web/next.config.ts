import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  images: {
    // On Cloudflare, Next's image optimizer would need Cloudflare Images
    // (billed per transformation). The tour photos are already 720x480 JPEGs
    // on TripAdvisor's CDN, so they are served as they are.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.tripadvisor.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "**.viator.com",
      },
    ],
  },

  // H1: Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            // Unchanged in the Cloudflare move. It blocks the Google Analytics
            // tag in layout.tsx, which keeps the privacy page's "no analytics"
            // promise true. Whether GA stays is the owner's call.
            value: [
              "default-src 'self'",
              "img-src 'self' https://*.tripadvisor.com https://*.cloudfront.net https://*.viator.com data:",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline'",
              "font-src 'self'",
              "connect-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

// Lets `next dev` reach the Cloudflare bindings (local D1) through wrangler.
initOpenNextCloudflareForDev();
