import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const SOCIAL_CARD = "https://tourgraph.ai/social-card.png";
const SITE_DESCRIPTION =
  "TourGraph: discover the world's most surprising tours. 136K+ experiences across 3,380 destinations with witty AI-generated captions. No signup, no tracking. By Nikhil Singhal.";

export const metadata: Metadata = {
  title: {
    default: "TourGraph: Discover the World's Most Surprising Tours",
    template: "%s | TourGraph",
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL("https://tourgraph.ai"),
  alternates: {
    canonical: "https://tourgraph.ai",
  },
  authors: [{ name: "Nikhil Singhal", url: "https://nikhilsinghal.com" }],
  keywords: [
    "tour discovery",
    "travel",
    "surprising tours",
    "weird tours",
    "tour database",
    "Viator",
    "TourGraph",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: "TourGraph",
    title: "TourGraph: Discover the World's Most Surprising Tours",
    description: SITE_DESCRIPTION,
    url: "https://tourgraph.ai",
    images: [
      {
        url: SOCIAL_CARD,
        width: 1200,
        height: 630,
        alt: "TourGraph: Discover the World's Most Surprising Tours",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TourGraph: Discover the World's Most Surprising Tours",
    description: SITE_DESCRIPTION,
    site: "@nikhilsinghal",
    creator: "@nikhilsinghal",
    images: [SOCIAL_CARD],
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://tourgraph.ai/#software",
      name: "TourGraph",
      applicationCategory: "TravelApplication",
      operatingSystem: "Web, iOS",
      url: "https://tourgraph.ai",
      image: SOCIAL_CARD,
      description: SITE_DESCRIPTION,
      creator: { "@id": "https://nikhilsinghal.com/#person" },
    },
    {
      "@type": "Person",
      "@id": "https://nikhilsinghal.com/#person",
      name: "Nikhil Singhal",
      givenName: "Nikhil",
      familyName: "Singhal",
      jobTitle:
        "CTO | VP Engineering | AI Practitioner & Governance Strategist",
      url: "https://nikhilsinghal.com",
      image: "https://nikhilsinghal.com/img/nikhil-singhal-portrait-1200.jpg",
      email: "mailto:nikhil@omspark.com",
      telephone: "+1-206-226-2722",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Seattle",
        addressRegion: "WA",
        addressCountry: "US",
      },
      sameAs: [
        "https://www.linkedin.com/in/nikhilsinghal/",
        "https://github.com/nikhilsi",
        "https://orcid.org/0009-0003-5449-6830",
        "https://nikhilsinghal-ai-trust-commons.medium.com/",
        "https://about.me/nikhil.singhal",
        "https://x.com/nikhilsinghal",
        "https://www.youtube.com/@nikhilsinghal",
        "https://aitrustcommons.org",
        "https://hipcharter.com",
        "https://omspark.com",
      ],
      knowsAbout: [
        "Artificial Intelligence",
        "AI Governance",
        "Human-AI Interaction",
        "Engineering Leadership",
        "AI Trust Commons",
        "Human Intelligence Partnership Charter",
        "Intent Layer",
        "Model Context Protocol",
        "Large Language Models",
        "AI Agents",
        "AI Memory",
      ],
      alumniOf: [
        { "@type": "EducationalOrganization", name: "Harvard University" },
        { "@type": "EducationalOrganization", name: "Bangalore University" },
      ],
      worksFor: {
        "@type": "Organization",
        name: "OmSpark LLC",
        url: "https://omspark.com",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://tourgraph.ai/#website",
      url: "https://tourgraph.ai",
      name: "TourGraph",
      about: { "@id": "https://tourgraph.ai/#software" },
      inLanguage: "en",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-LMSTJHBDPZ"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-LMSTJHBDPZ');
        `}</Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body className="min-h-screen bg-bg text-text flex flex-col">
        <div className="flex-1">{children}</div>
        {/* Footer */}
        <footer className="text-xs text-text-dim py-6 px-4 border-t border-text-dim/10">
          <div className="max-w-md mx-auto flex flex-col items-center gap-3">
            {/* Viator attribution */}
            <p className="text-[10px]">
              Tour data powered by{" "}
              <a
                href="https://www.viator.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-text-muted transition-colors"
              >
                Viator
              </a>
            </p>

            {/* Social links */}
            <div className="flex items-center gap-4">
              <a
                href="https://nikhilsinghal.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
                aria-label="nikhilsinghal.com"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </a>
              <a
                href="https://github.com/nikhilsi/tourgraph"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-muted transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/nikhilsinghal/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-muted transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>

            {/* Copyright */}
            <p>
              &copy; {new Date().getFullYear()} OmSpark LLC. Built by{" "}
              <a
                href="https://nikhilsinghal.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-accent transition-colors"
              >
                Nikhil Singhal
              </a>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
