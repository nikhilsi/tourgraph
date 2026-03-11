import Link from "next/link";
import type { Metadata } from "next";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Support — TourGraph",
  description: "Get help with TourGraph — the world's most surprising tours.",
};

export default function SupportPage() {
  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      <Logo className="mb-8" />

      <div className="w-full max-w-lg space-y-8">
        <h1 className="text-3xl font-bold">Support</h1>

        <p className="text-sm text-text-muted leading-relaxed">
          TourGraph is a tour discovery app that surfaces surprising experiences
          from around the world. If you run into issues or have suggestions,
          we&apos;d love to hear from you.
        </p>

        <section>
          <h2 className="text-lg font-semibold mb-3">Common Questions</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">How does Tour Roulette work?</p>
              <p className="text-sm text-text-muted">
                Each spin shows you a random tour weighted toward interesting
                extremes — highest rated, cheapest 5-star, most expensive, most
                unique. Swipe or tap &ldquo;Show Me Another&rdquo; for the next
                one.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Can I book tours through TourGraph?</p>
              <p className="text-sm text-text-muted">
                TourGraph is for discovery, not booking. When you find a tour you
                love, tap &ldquo;Book on Viator&rdquo; to complete your booking
                on Viator&apos;s website.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Does the app need internet?</p>
              <p className="text-sm text-text-muted">
                The iOS app works offline — all tour data is bundled. Photos
                require an internet connection to load, but everything else works
                without it.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">How do I save favorites?</p>
              <p className="text-sm text-text-muted">
                Tap the heart icon on any tour card or detail page. Favorites are
                stored locally on your device.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Do you collect any personal data?</p>
              <p className="text-sm text-text-muted">
                No. See our{" "}
                <Link href="/privacy" className="text-accent hover:underline">
                  privacy policy
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <section className="pb-4">
          <h2 className="text-lg font-semibold mb-3">Contact</h2>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm text-text-muted">
              For bug reports, feedback, or feature requests:
            </p>
            <p className="text-sm mt-2">
              <a
                href="mailto:nikhilsinghal@hotmail.com"
                className="text-accent hover:underline"
              >
                nikhilsinghal@hotmail.com
              </a>
            </p>
          </div>
        </section>

        <div className="pt-4 border-t border-text-dim/20">
          <Link href="/" className="text-sm text-text-dim hover:text-text-muted transition-colors">
            &larr; Back to TourGraph
          </Link>
        </div>
      </div>
    </main>
  );
}
