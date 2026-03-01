import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import FeatureNav from "@/components/FeatureNav";

export const metadata: Metadata = {
  title: "About — TourGraph",
  description:
    "TourGraph is a zero-friction site that surfaces the world's most surprising tours. No signup, no tracking, just delight.",
  openGraph: {
    title: "About TourGraph",
    description:
      "Zero friction. Instant smiles. The world's most surprising tours.",
  },
};

function getStats() {
  const db = getDb(true);
  const tours = (
    db.prepare("SELECT COUNT(*) as c FROM tours WHERE status = 'active'").get() as { c: number }
  ).c;
  const destinations = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT destination_name) as c FROM tours WHERE status = 'active'`
      )
      .get() as { c: number }
  ).c;
  const countries = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT country) as c FROM tours WHERE status = 'active' AND country IS NOT NULL`
      )
      .get() as { c: number }
  ).c;
  return { tours, destinations, countries };
}

export default function AboutPage() {
  const stats = getStats();

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      <Link
        href="/"
        className="text-2xl font-bold tracking-tight mb-8 hover:text-accent transition-colors"
      >
        TourGraph
      </Link>

      <div className="w-full max-w-lg space-y-10">
        {/* Intro */}
        <section>
          <h1 className="text-3xl font-bold mb-4">About TourGraph</h1>
          <p className="text-text-muted leading-relaxed">
            TourGraph is a place you visit because it makes you smile. We
            surface the world&apos;s most surprising, weird, and wonderful tour
            experiences — from fairy hunting in Iceland to midnight street food
            crawls in Bangkok. No signup. No tracking. No algorithms deciding
            what you see. Just serendipity.
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-4 text-center py-6 border-y border-text-dim/20">
          <div>
            <p className="text-2xl font-bold text-accent">
              {stats.tours.toLocaleString()}
            </p>
            <p className="text-xs text-text-dim mt-1">tours indexed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent">
              {stats.destinations.toLocaleString()}
            </p>
            <p className="text-xs text-text-dim mt-1">destinations</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent">
              {stats.countries.toLocaleString()}
            </p>
            <p className="text-xs text-text-dim mt-1">countries</p>
          </div>
        </section>

        {/* Four Pillars */}
        <section>
          <h2 className="text-xl font-bold mb-4">Four Pillars</h2>
          <p className="text-sm text-text-muted mb-4">
            Every feature and design decision passes all four tests.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Zero Friction</h3>
              <p className="text-sm text-text-muted">
                No signup, no login, no cookies beyond essentials. A stranger
                lands here and is delighted within 5 seconds.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Instant Smile</h3>
              <p className="text-sm text-text-muted">
                Warm, witty, wonder-filled. Never snarky. The goal is
                &ldquo;oh wow, I didn&apos;t know that existed.&rdquo;
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Effortlessly Shareable</h3>
              <p className="text-sm text-text-muted">
                Every piece of content has a unique URL and a beautiful preview
                card. See something fun, share it, your friend smiles too.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Rabbit Hole Energy</h3>
              <p className="text-sm text-text-muted">
                That &ldquo;one more click&rdquo; quality through genuine
                curiosity, not dark patterns. You came for one tour and 20
                minutes later you&apos;re somewhere unexpected.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-xl font-bold mb-4">Features</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">
                <Link href="/" className="hover:text-accent transition-colors">
                  Tour Roulette
                </Link>
              </h3>
              <p className="text-sm text-text-muted">
                One button. Random tour. Weighted toward extremes — highest
                rated, cheapest, weirdest, most expensive. Press again.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">
                <Link
                  href="/right-now"
                  className="hover:text-accent transition-colors"
                >
                  Right Now Somewhere
                </Link>
              </h3>
              <p className="text-sm text-text-muted">
                Time-zone-aware tours happening where it&apos;s golden hour
                right now. Instant teleportation feeling.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">
                <Link
                  href="/worlds-most"
                  className="hover:text-accent transition-colors"
                >
                  The World&apos;s Most ___
                </Link>
              </h3>
              <p className="text-sm text-text-muted">
                Superlatives from the global tour catalog. Most expensive.
                Cheapest 5-star. Longest. Each one a shareable card.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Six Degrees of Anywhere</h3>
              <p className="text-sm text-text-muted">
                Two cities connected through a chain of real tours with
                surprising thematic links. Coming soon.
              </p>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section>
          <h2 className="text-xl font-bold mb-4">How It&apos;s Built</h2>
          <div className="text-sm text-text-muted space-y-2">
            <p>
              <span className="text-text">Next.js</span> with React Server
              Components for instant page loads and SEO-friendly OG previews.
            </p>
            <p>
              <span className="text-text">SQLite</span> as a pre-built local
              index — zero API calls at page load, sub-50ms queries.
            </p>
            <p>
              <span className="text-text">Viator Partner API</span> for tour
              data: photos, pricing, ratings, and descriptions across 300,000+
              experiences worldwide.
            </p>
            <p>
              <span className="text-text">Claude API</span> for AI-generated
              witty one-liners and Six Degrees chain connections.
            </p>
            <p>
              <span className="text-text">TypeScript</span> throughout, strict
              mode, zero lint warnings.
            </p>
          </div>
        </section>

        {/* Built By */}
        <section className="pb-4">
          <h2 className="text-xl font-bold mb-4">Built By</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            TourGraph is built by{" "}
            <a
              href="https://www.linkedin.com/in/nikhilsinghal/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Nikhil Singhal
            </a>
            , a technology executive with 25+ years of experience building
            products at Expedia, T-Mobile, Microsoft, and startups. Previously
            CTO at Tour Guy (AI-powered travel, 400% efficiency gains) and
            Imperative (scaled $1M to $4M ARR). Based in Seattle.
          </p>
          <p className="text-sm text-text-muted leading-relaxed mt-3">
            Read the{" "}
            <Link
              href="/story"
              className="text-accent hover:underline"
            >
              origin story
            </Link>{" "}
            to learn how TourGraph went from a competitive analysis that said
            &ldquo;kill the project&rdquo; to a site that makes people smile.
          </p>
        </section>

        <FeatureNav current="about" />
      </div>
    </main>
  );
}
