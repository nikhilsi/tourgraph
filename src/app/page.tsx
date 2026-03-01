import Link from "next/link";
import RouletteView from "@/components/RouletteView";
import FeatureNav from "@/components/FeatureNav";
import {
  getDistinctTimezones,
  getRightNowTours,
  tourRowToRouletteTour,
  getAllSuperlatives,
  getAllChains,
} from "@/lib/db";
import {
  getGoldenTimezones,
  getPleasantTimezones,
  formatLocalTime,
  getCurrentHour,
  getTimeOfDayLabel,
} from "@/lib/timezone";
import { formatPrice, formatDurationShort } from "@/lib/format";

function getRightNowTeaser() {
  try {
    const allTzs = getDistinctTimezones();
    let matchedTzs = getGoldenTimezones(allTzs);
    if (matchedTzs.length === 0) matchedTzs = getPleasantTimezones(allTzs);
    const [tour] = getRightNowTours(matchedTzs, 1);
    if (!tour || !tour.timezone) return null;
    const localTime = formatLocalTime(tour.timezone);
    const label = getTimeOfDayLabel(getCurrentHour(tour.timezone));
    return { tour: tourRowToRouletteTour(tour), localTime, label };
  } catch {
    return null;
  }
}

export default function Home() {
  const teaser = getRightNowTeaser();
  const superlatives = getAllSuperlatives();
  const chains = getAllChains();

  // Pick one interesting superlative for the teaser
  const featuredSuperlative = superlatives.find(
    (s) => s.type === "most-expensive" || s.type === "hidden-gem"
  );

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      {/* Brand + Tagline */}
      <h1 className="text-2xl font-bold tracking-tight">TourGraph</h1>
      <p className="text-sm text-text-muted mt-1 mb-8 text-center max-w-xs">
        The world&apos;s most surprising tours. One tap at a time.
      </p>

      {/* Roulette — the hero */}
      <section className="w-full max-w-md mb-6">
        <p className="text-xs text-text-dim text-center mb-4">
          Press the button. Get a random tour from somewhere in the world.
        </p>
        <RouletteView />
      </section>

      {/* Right Now teaser */}
      {teaser && (
        <Link
          href="/right-now"
          className="mt-2 text-sm text-text-muted hover:text-text transition-colors text-center"
        >
          Right now in {teaser.tour.destinationName}, it&apos;s{" "}
          <span className="text-accent">{teaser.localTime}</span>
          <span className="text-text-dim"> · {teaser.label}</span>
        </Link>
      )}

      {/* Feature teasers */}
      <section className="w-full max-w-md mt-10 space-y-3">
        <h2 className="text-xs font-medium tracking-widest uppercase text-text-dim text-center mb-4">
          More to explore
        </h2>

        {/* Right Now */}
        <Link
          href="/right-now"
          className="block rounded-2xl bg-surface p-4 hover:bg-surface-hover transition-colors"
        >
          <h3 className="text-sm font-bold">Right Now Somewhere...</h3>
          <p className="text-xs text-text-muted mt-1">
            Tours happening right now in golden-hour cities around the world.
          </p>
        </Link>

        {/* World's Most */}
        <Link
          href="/worlds-most"
          className="block rounded-2xl bg-surface p-4 hover:bg-surface-hover transition-colors"
        >
          <h3 className="text-sm font-bold">The World&apos;s Most ___</h3>
          <p className="text-xs text-text-muted mt-1">
            {featuredSuperlative
              ? `The most expensive tour costs ${formatPrice(featuredSuperlative.tour.from_price ?? 0)}. The longest takes ${formatDurationShort(featuredSuperlative.tour.duration_minutes ?? 0)}.`
              : "Daily superlatives from 300,000+ experiences. Most expensive, cheapest 5-star, longest, and more."}
          </p>
        </Link>

        {/* Six Degrees */}
        <Link
          href="/six-degrees"
          className="block rounded-2xl bg-surface p-4 hover:bg-surface-hover transition-colors"
        >
          <h3 className="text-sm font-bold">Six Degrees of Anywhere</h3>
          <p className="text-xs text-text-muted mt-1">
            {chains.length > 0
              ? `${chains.length} curated chains connecting cities through surprising thematic links.`
              : "Every city is connected. Follow the thematic thread from one corner of the world to another."}
          </p>
        </Link>
      </section>

      {/* Feature Nav */}
      <div className="mt-10 mb-4">
        <FeatureNav current="roulette" />
      </div>
    </main>
  );
}
