import Link from "next/link";
import type { Metadata } from "next";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy — TourGraph",
  description: "TourGraph does not collect, store, or transmit any personal data.",
};

export default function PrivacyPage() {
  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      <Logo className="mb-8" />

      <div className="w-full max-w-lg space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-text-dim">Effective: March 1, 2026</p>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-2">Overview</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            TourGraph is built with your privacy as a priority. The app and
            website do not collect, store, or transmit any personal data. Your
            browsing experience is entirely private.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Data Collection</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            TourGraph collects no personal information. No analytics, no
            tracking, no advertising identifiers, no cookies, and no third-party
            SDKs.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Local Storage (iOS App)</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            The iOS app stores your preferences (haptic feedback setting) and
            favorite tours locally on your device using iOS UserDefaults. This
            data never leaves your device and is not accessible to us or any
            third party. Deleting the app removes all stored data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Tour Data</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Tour information displayed in TourGraph (titles, descriptions,
            photos, ratings, prices) comes from Viator, a Booking Holdings
            company. When you tap &ldquo;Book on Viator,&rdquo; you are directed
            to Viator&apos;s website, which is governed by Viator&apos;s own
            privacy policy. Tour photos are loaded from Viator&apos;s content
            delivery network via standard HTTP requests.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Children&apos;s Privacy</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            TourGraph does not collect data from anyone, including children
            under 13.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Changes to This Policy</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            If this policy changes, the updated version will be posted here with
            a new effective date.
          </p>
        </section>

        <section className="pb-4">
          <h2 className="text-lg font-semibold mb-2">Contact</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Questions about this privacy policy? Reach us at{" "}
            <a
              href="mailto:nikhilsinghal@hotmail.com"
              className="text-accent hover:underline"
            >
              nikhilsinghal@hotmail.com
            </a>
            .
          </p>
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
