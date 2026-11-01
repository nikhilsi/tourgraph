import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  images: {
    // On Cloudflare, Next's image optimizer would need Cloudflare Images
    // (billed per transformation). The tour photos are already 720x480 JPEGs
    // on TripAdvisor's CDN, so they are served as they are. No remotePatterns:
    // with them, /_next/image would pass any matching host's images through
    // this Worker (review R13). The CSP below still limits image hosts.
    unoptimized: true,
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
            // Google Analytics hosts are Google's list for GA without Ads
            // features (developers.google.com/tag-platform/security/guides/csp).
            // GA was blocked here from June to Nov 2026; Nikhil chose to keep
            // it on Nov 1, 2026, and the privacy page says so.
            // Keep in step with public/_headers.
            value: [
              "default-src 'self'",
              "img-src 'self' https://*.tripadvisor.com https://*.cloudfront.net https://*.viator.com https://www.googletagmanager.com https://*.google-analytics.com data:",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
              "font-src 'self'",
              "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com",
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
