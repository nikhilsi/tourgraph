import { cache } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getTourById } from "@/lib/db";
import { formatDurationLong } from "@/lib/format";
import { safeJsonParse } from "@/lib/format";
import ShareButton from "@/components/ShareButton";
import FeatureNav from "@/components/FeatureNav";

interface Props {
  params: Promise<{ id: string }>;
}

// M2: Memoize within a single request to avoid duplicate DB calls
const getCachedTour = cache((id: number) => getTourById(id));

// H4: Validate ID parameter
function parseAndValidateId(raw: string): number | null {
  const id = parseInt(raw, 10);
  if (isNaN(id) || id <= 0 || id > 2147483647) return null;
  return id;
}

// M16: Append campaign tracking to Viator affiliate URL
function withCampaign(url: string, campaign: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}campaign=${campaign}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numId = parseAndValidateId(id);
  if (!numId) return { title: "Tour Not Found" };

  const tour = getCachedTour(numId);
  if (!tour) return { title: "Tour Not Found" };

  const description =
    tour.one_liner ||
    `${tour.title} in ${tour.destination_name}, ${tour.country}`;

  const ogImage = `/api/og/roulette/${id}`;

  return {
    title: `${tour.title} — TourGraph`,
    description,
    openGraph: {
      title: tour.title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: tour.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function TourDetailPage({ params }: Props) {
  const { id } = await params;
  const numId = parseAndValidateId(id);
  if (!numId) notFound();

  const tour = getCachedTour(numId);
  if (!tour) notFound();

  // M13: Safe JSON parse with fallback
  const inclusions = safeJsonParse<string[]>(tour.inclusions_json, []);
  const imageUrls = safeJsonParse<string[]>(tour.image_urls_json, []);

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      {/* Brand */}
      <Link href="/" className="text-2xl font-bold tracking-tight mb-6 hover:text-accent transition-colors">
        TourGraph
      </Link>

      {/* Feature badge */}
      <span className="text-xs font-medium tracking-widest uppercase text-accent mb-4">
        Tour Roulette
      </span>

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
          <h1 className="text-2xl font-bold leading-tight">{tour.title}</h1>

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

          {/* Stats — M7: use > 0 instead of truthy check to avoid rendering bare "0" */}
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
              <span title={`Starting from $${Math.round(tour.from_price)}`}>${Math.round(tour.from_price)}</span>
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
              <h3 className="text-sm font-semibold mb-2">What&apos;s Included</h3>
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

          {/* Actions — M16: campaign tracking on Viator link */}
          <div className="flex items-center gap-3 pt-3">
            {tour.viator_url && (
              <a
                href={withCampaign(tour.viator_url, "roulette")}
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
            <div key={i} className="relative aspect-[3/2] rounded-lg overflow-hidden bg-surface-hover">
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

      {/* Spin your own */}
      <div className="mt-8 mb-4 flex flex-col items-center gap-4">
        <Link
          href="/"
          title="Discover a random tour from anywhere in the world"
          className="py-3 px-8 rounded-xl border border-accent text-accent hover:bg-accent hover:text-black font-bold transition-colors"
        >
          Spin Your Own
        </Link>

        <FeatureNav current="roulette" />
      </div>
    </main>
  );
}
