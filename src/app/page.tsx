import Link from "next/link";
import RouletteView from "@/components/RouletteView";
import FeatureNav from "@/components/FeatureNav";
import { getDistinctTimezones, getRightNowTours, tourRowToRouletteTour } from "@/lib/db";
import { getGoldenTimezones, getPleasantTimezones, formatLocalTime, getCurrentHour, getTimeOfDayLabel } from "@/lib/timezone";

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

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      {/* Brand */}
      <h1 className="text-2xl font-bold tracking-tight mb-8">TourGraph</h1>

      {/* Roulette */}
      <RouletteView />

      {/* Right Now teaser */}
      {teaser && (
        <Link
          href="/right-now"
          className="mt-6 text-sm text-text-muted hover:text-text transition-colors text-center"
        >
          Right now in {teaser.tour.destinationName}, it&apos;s{" "}
          <span className="text-accent">{teaser.localTime}</span>
          <span className="text-text-dim"> · {teaser.label}</span>
        </Link>
      )}

      {/* Feature Nav */}
      <div className="mt-8 mb-4">
        <FeatureNav current="roulette" />
      </div>
    </main>
  );
}
