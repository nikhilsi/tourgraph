import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getAllSuperlatives } from "@/lib/db";
import { formatPrice, formatDurationShort } from "@/lib/format";
import type { SuperlativeType, TourRow } from "@/lib/types";
import FeatureNav from "@/components/FeatureNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The World's Most ___ — TourGraph",
  description:
    "The most expensive, cheapest, longest, shortest, and most surprising tours on Earth.",
  openGraph: {
    title: "The World's Most ___",
    description:
      "The most expensive, cheapest, longest, shortest, and most surprising tours on Earth.",
    images: [{ url: "/api/og/worlds-most/most-expensive", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The World's Most ___",
    description:
      "The most expensive, cheapest, longest, shortest, and most surprising tours on Earth.",
    images: ["/api/og/worlds-most/most-expensive"],
  },
};

const SUPERLATIVE_DISPLAY: Record<
  SuperlativeType,
  { title: string; statFn: (tour: TourRow) => string }
> = {
  "most-expensive": {
    title: "Most Expensive Tour",
    statFn: (t) => formatPrice(t.from_price ?? 0),
  },
  "cheapest-5star": {
    title: "Cheapest 5-Star Experience",
    statFn: (t) => formatPrice(t.from_price ?? 0),
  },
  longest: {
    title: "Longest Tour on Earth",
    statFn: (t) => formatDurationShort(t.duration_minutes ?? 0),
  },
  shortest: {
    title: "Shortest Tour on Earth",
    statFn: (t) => formatDurationShort(t.duration_minutes ?? 0),
  },
  "most-reviewed": {
    title: "Most Reviewed Tour",
    statFn: (t) =>
      `${(t.review_count ?? 0).toLocaleString("en-US")} reviews`,
  },
  "hidden-gem": {
    title: "Highest-Rated Hidden Gem",
    statFn: (t) =>
      `${(t.rating ?? 0).toFixed(1)} stars`,
  },
};

export default function WorldsMostPage() {
  const superlatives = getAllSuperlatives();

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      <Link
        href="/"
        className="text-2xl font-bold tracking-tight mb-6 hover:text-accent transition-colors"
      >
        TourGraph
      </Link>

      <span className="text-xs font-medium tracking-widest uppercase text-accent mb-2">
        The World&apos;s Most ___
      </span>
      <p className="text-text-muted text-sm mb-8 text-center max-w-md">
        Superlatives from 4,000+ tours around the globe
      </p>

      {superlatives.length === 0 ? (
        <p className="text-text-muted">
          No superlatives available right now. Check back soon!
        </p>
      ) : (
        <div className="w-full max-w-lg space-y-6">
          {superlatives.map(({ type, tour }) => {
            const display = SUPERLATIVE_DISPLAY[type];
            return (
              <SuperlativeCard
                key={type}
                slug={type}
                title={display.title}
                stat={display.statFn(tour)}
                tour={tour}
              />
            );
          })}
        </div>
      )}

      <div className="mt-8 mb-4">
        <FeatureNav current="worlds-most" />
      </div>
    </main>
  );
}

function SuperlativeCard({
  slug,
  title,
  stat,
  tour,
}: {
  slug: string;
  title: string;
  stat: string;
  tour: TourRow;
}) {
  const location = [tour.destination_name, tour.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/worlds-most/${slug}`}
      className="block w-full rounded-2xl overflow-hidden bg-surface hover:ring-2 hover:ring-accent/50 transition-all"
    >
      {/* Superlative badge + stat */}
      <div className="px-4 pt-4 pb-2 flex items-baseline justify-between">
        <span className="text-accent font-medium text-sm">{title}</span>
        <span className="text-lg font-bold">{stat}</span>
      </div>

      {/* Tour photo */}
      <div className="relative aspect-[3/2]">
        {tour.image_url ? (
          <Image
            src={tour.image_url}
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
      </div>

      {/* Content */}
      <div className="p-4 space-y-1">
        <h2 className="text-lg font-bold leading-tight line-clamp-2">
          {tour.title}
        </h2>
        <p className="text-sm text-text-muted">{location}</p>
      </div>
    </Link>
  );
}
