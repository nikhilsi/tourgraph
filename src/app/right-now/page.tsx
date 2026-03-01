import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  getDistinctTimezones,
  getRightNowTours,
  tourRowToRouletteTour,
} from "@/lib/db";
import {
  getGoldenTimezones,
  getPleasantTimezones,
  formatLocalTime,
  getCurrentHour,
  getTimeOfDayLabel,
} from "@/lib/timezone";
import { formatDurationShort } from "@/lib/format";
import type { RightNowMoment } from "@/lib/types";
import ShareButton from "@/components/ShareButton";
import FeatureNav from "@/components/FeatureNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Right Now Somewhere... — TourGraph",
  description:
    "See what's happening in the world's most beautiful places right now.",
  openGraph: {
    title: "Right Now Somewhere...",
    description:
      "See what's happening in the world's most beautiful places right now.",
    images: [{ url: "/api/og/right-now", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Right Now Somewhere...",
    description:
      "See what's happening in the world's most beautiful places right now.",
    images: ["/api/og/right-now"],
  },
};

function getMoments(count: number): RightNowMoment[] {
  const allTimezones = getDistinctTimezones();

  // Try golden hour first, fall back to pleasant daytime
  let matchedTzs = getGoldenTimezones(allTimezones);
  if (matchedTzs.length < count) {
    const pleasant = getPleasantTimezones(allTimezones);
    const goldenSet = new Set(matchedTzs);
    for (const tz of pleasant) {
      if (!goldenSet.has(tz)) matchedTzs.push(tz);
    }
  }

  const tours = getRightNowTours(matchedTzs, count);

  return tours.map((tour) => {
    const tz = tour.timezone!;
    const hour = getCurrentHour(tz);
    return {
      tour: tourRowToRouletteTour(tour),
      timezone: tz,
      localTime: formatLocalTime(tz),
      timeOfDayLabel: getTimeOfDayLabel(hour),
    };
  });
}

export default function RightNowPage() {
  const moments = getMoments(6);

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      <Link
        href="/"
        className="text-2xl font-bold tracking-tight mb-6 hover:text-accent transition-colors"
      >
        TourGraph
      </Link>

      <span className="text-xs font-medium tracking-widest uppercase text-accent mb-2">
        Right Now Somewhere...
      </span>
      <p className="text-text-muted text-sm mb-8 text-center max-w-md">
        Beautiful moments happening around the world right now
      </p>

      {moments.length === 0 ? (
        <p className="text-text-muted">
          No moments available right now. Check back soon!
        </p>
      ) : (
        <div className="w-full max-w-lg space-y-6">
          {moments.map((moment) => (
            <MomentCard key={moment.tour.id} moment={moment} />
          ))}
        </div>
      )}

      <div className="mt-8 mb-4">
        <FeatureNav current="right-now" />
      </div>
    </main>
  );
}

function MomentCard({ moment }: { moment: RightNowMoment }) {
  const { tour, localTime, timeOfDayLabel } = moment;

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-surface">
      {/* Time badge */}
      <div className="px-4 pt-4 pb-2">
        <span className="text-accent font-medium text-sm">
          {localTime} · {timeOfDayLabel}
        </span>
        <span className="text-text-dim text-sm ml-2">
          in {tour.destinationName}
          {tour.country ? `, ${tour.country}` : ""}
        </span>
      </div>

      {/* Tour photo */}
      <Link
        href={`/roulette/${tour.id}`}
        className="block relative aspect-[3/2]"
      >
        {tour.imageUrl ? (
          <Image
            src={tour.imageUrl}
            alt={tour.title}
            fill
            sizes="(max-width: 768px) 100vw, 512px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-surface-hover flex items-center justify-center">
            <span className="text-text-dim text-sm">No photo</span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 space-y-2">
        <Link href={`/roulette/${tour.id}`}>
          <h2 className="text-lg font-bold leading-tight line-clamp-2 hover:text-accent transition-colors">
            {tour.title}
          </h2>
        </Link>

        {tour.oneLiner && (
          <p className="text-sm italic text-text-muted line-clamp-2">
            &ldquo;{tour.oneLiner}&rdquo;
          </p>
        )}

        <div className="flex items-center gap-3 text-sm text-text-muted">
          {tour.rating > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-accent">&#9733;</span>
              {tour.rating.toFixed(1)}
            </span>
          )}
          {tour.fromPrice > 0 && <span>${Math.round(tour.fromPrice)}</span>}
          {tour.durationMinutes > 0 && (
            <span>{formatDurationShort(tour.durationMinutes)}</span>
          )}
        </div>

        <div className="pt-1">
          <ShareButton
            tourId={tour.id}
            title={tour.title}
            oneLiner={tour.oneLiner}
          />
        </div>
      </div>
    </div>
  );
}
