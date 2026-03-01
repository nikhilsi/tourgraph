import { cache } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getSuperlative } from "@/lib/db";
import { formatPrice, formatDurationLong, safeJsonParse } from "@/lib/format";
import type { SuperlativeType, TourRow } from "@/lib/types";
import ShareButton from "@/components/ShareButton";
import FeatureNav from "@/components/FeatureNav";

interface Props {
  params: Promise<{ slug: string }>;
}

const VALID_SLUGS: SuperlativeType[] = [
  "most-expensive",
  "cheapest-5star",
  "longest",
  "shortest",
  "most-reviewed",
  "hidden-gem",
];

const SUPERLATIVE_DISPLAY: Record<
  SuperlativeType,
  { title: string; description: string; statFn: (tour: TourRow) => string }
> = {
  "most-expensive": {
    title: "The Most Expensive Tour",
    description: "The priciest experience money can buy",
    statFn: (t) => formatPrice(t.from_price ?? 0),
  },
  "cheapest-5star": {
    title: "The Cheapest 5-Star Experience",
    description: "Top-rated and practically free",
    statFn: (t) => formatPrice(t.from_price ?? 0),
  },
  longest: {
    title: "The Longest Tour on Earth",
    description: "Pack your bags — you'll be gone a while",
    statFn: (t) => formatDurationLong(t.duration_minutes ?? 0),
  },
  shortest: {
    title: "The Shortest Tour on Earth",
    description: "Blink and you might miss it",
    statFn: (t) => formatDurationLong(t.duration_minutes ?? 0),
  },
  "most-reviewed": {
    title: "The Most Reviewed Tour",
    description: "More reviews than most restaurants",
    statFn: (t) =>
      `${(t.review_count ?? 0).toLocaleString("en-US")} reviews`,
  },
  "hidden-gem": {
    title: "The Highest-Rated Hidden Gem",
    description: "Perfect rating, almost nobody knows about it",
    statFn: (t) =>
      `${(t.rating ?? 0).toFixed(1)} stars · ${(t.review_count ?? 0).toLocaleString("en-US")} reviews`,
  },
};

function isValidSlug(slug: string): slug is SuperlativeType {
  return VALID_SLUGS.includes(slug as SuperlativeType);
}

// Memoize within a single request
const getCachedSuperlative = cache(
  (type: SuperlativeType) => getSuperlative(type)
);

function withCampaign(url: string, campaign: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}campaign=${campaign}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) return { title: "Not Found" };

  const tour = getCachedSuperlative(slug);
  if (!tour) return { title: "Not Found" };

  const display = SUPERLATIVE_DISPLAY[slug];
  const stat = display.statFn(tour);
  const description = `${display.title}: ${tour.title} — ${stat}`;
  const ogImage = `/api/og/worlds-most/${slug}`;

  return {
    title: `${display.title} — TourGraph`,
    description,
    openGraph: {
      title: display.title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: display.title,
      description,
      images: [ogImage],
    },
  };
}

export function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }));
}

export const dynamic = "force-dynamic";

export default async function SuperlativeDetailPage({ params }: Props) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const tour = getCachedSuperlative(slug);
  if (!tour) notFound();

  const display = SUPERLATIVE_DISPLAY[slug];
  const stat = display.statFn(tour);
  const inclusions = safeJsonParse<string[]>(tour.inclusions_json, []);
  const imageUrls = safeJsonParse<string[]>(tour.image_urls_json, []);

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      {/* Brand */}
      <Link
        href="/"
        className="text-2xl font-bold tracking-tight mb-6 hover:text-accent transition-colors"
      >
        TourGraph
      </Link>

      {/* Feature badge */}
      <span className="text-xs font-medium tracking-widest uppercase text-accent mb-4">
        The World&apos;s Most ___
      </span>

      {/* Superlative hero */}
      <div className="w-full max-w-lg text-center mb-6">
        <h1 className="text-xl font-bold mb-1">{display.title}</h1>
        <p className="text-text-muted text-sm">{display.description}</p>
        <p className="text-3xl font-bold text-accent mt-3">{stat}</p>
      </div>

      {/* Tour Card */}
      <div className="w-full max-w-lg rounded-2xl overflow-hidden bg-surface">
        {/* Hero image */}
        {tour.image_url ? (
          <div className="relative aspect-[3/2]">
            <Image
              src={tour.image_url}
              alt={tour.title}
              fill
              sizes="(max-width: 768px) 100vw, 512px"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="aspect-[3/2] bg-surface-hover flex items-center justify-center">
            <span className="text-text-dim text-sm">No photo</span>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Title */}
          <h2 className="text-2xl font-bold leading-tight">{tour.title}</h2>

          {/* Location */}
          <p className="text-sm text-text-muted">
            {tour.destination_name}
            {tour.country ? `, ${tour.country}` : ""}
          </p>

          {/* One-liner */}
          {tour.one_liner && (
            <p className="text-base italic text-text-muted leading-relaxed">
              &ldquo;{tour.one_liner}&rdquo;
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-text-muted">
            {tour.rating != null && tour.rating > 0 && (
              <span className="flex items-center gap-1" title={`${tour.rating.toFixed(1)} out of 5 stars`}>
                <span className="text-accent">&#9733;</span>
                {tour.rating.toFixed(1)}
                {tour.review_count != null && tour.review_count > 0 && (
                  <span className="text-text-dim">
                    ({tour.review_count.toLocaleString()})
                  </span>
                )}
              </span>
            )}
            {tour.from_price != null && tour.from_price > 0 && (
              <span title={`Starting from ${formatPrice(tour.from_price)}`}>{formatPrice(tour.from_price)}</span>
            )}
            {tour.duration_minutes != null && tour.duration_minutes > 0 && (
              <span title={`Tour duration: ${formatDurationLong(tour.duration_minutes)}`}>{formatDurationLong(tour.duration_minutes)}</span>
            )}
          </div>

          {/* Description */}
          {tour.description && (
            <div className="pt-2 border-t border-text-dim/20">
              <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line">
                {tour.description}
              </p>
            </div>
          )}

          {/* Inclusions */}
          {inclusions.length > 0 && (
            <div className="pt-2 border-t border-text-dim/20">
              <h3 className="text-sm font-semibold mb-2">
                What&apos;s Included
              </h3>
              <ul className="text-sm text-text-muted space-y-1">
                {inclusions.map((inc, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">&#10003;</span>
                    {inc}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3">
            {tour.viator_url && (
              <a
                href={withCampaign(tour.viator_url, "worlds-most")}
                target="_blank"
                rel="noopener noreferrer"
                title="Book this tour on Viator"
                className="flex-1 py-3 px-6 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold text-center transition-colors"
              >
                Book on Viator &rarr;
              </a>
            )}
            <ShareButton
              tourId={tour.id}
              title={tour.title}
              oneLiner={tour.one_liner || ""}
            />
          </div>
        </div>
      </div>

      {/* More images */}
      {imageUrls.length > 1 && (
        <div className="w-full max-w-lg mt-4 grid grid-cols-2 gap-2">
          {imageUrls.slice(1, 5).map((url, i) => (
            <div
              key={i}
              className="relative aspect-[3/2] rounded-lg overflow-hidden bg-surface-hover"
            >
              <Image
                src={url}
                alt={`${tour.title} photo ${i + 2}`}
                fill
                sizes="(max-width: 768px) 50vw, 256px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Back to gallery + Spin your own */}
      <div className="mt-8 mb-4 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/worlds-most"
            className="py-3 px-6 rounded-xl border border-accent text-accent hover:bg-accent hover:text-black font-bold transition-colors"
          >
            See All Superlatives
          </Link>
          <Link
            href="/"
            title="Discover a random tour from anywhere in the world"
            className="py-3 px-6 rounded-xl border border-text-dim/30 text-text-muted hover:border-accent hover:text-accent font-bold transition-colors"
          >
            Spin Your Own
          </Link>
        </div>

        <FeatureNav current="worlds-most" />
      </div>
    </main>
  );
}
