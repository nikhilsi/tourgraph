import { cache } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getSuperlative } from "@/lib/db";
import { safeJsonParse, formatPrice, formatDurationLong } from "@/lib/format";
import type { SuperlativeType } from "@/lib/types";
import { isValidSlug, SUPERLATIVE_TITLES, SUPERLATIVE_DESCRIPTIONS, superlativeStatLong } from "@/lib/superlatives";
import ShareButton from "@/components/ShareButton";
import FeatureNav from "@/components/FeatureNav";
import Logo from "@/components/Logo";

interface Props {
  params: Promise<{ slug: string }>;
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

  const title = SUPERLATIVE_TITLES[slug];
  const stat = superlativeStatLong(slug, tour);
  const description = `${title}: ${tour.title} — ${stat}`;
  const ogImage = `/api/og/worlds-most/${slug}`;

  return {
    title: `${title} — TourGraph`,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export const dynamic = "force-dynamic";

export default async function SuperlativeDetailPage({ params }: Props) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();

  const tour = getCachedSuperlative(slug);
  if (!tour) notFound();

  const displayTitle = SUPERLATIVE_TITLES[slug];
  const displayDesc = SUPERLATIVE_DESCRIPTIONS[slug];
  const stat = superlativeStatLong(slug, tour);
  const inclusions = safeJsonParse<string[]>(tour.inclusions_json, []);
  const imageUrls = safeJsonParse<string[]>(tour.image_urls_json, []);

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      {/* Brand */}
      <Logo />

      {/* Feature badge */}
      <span className="text-xs font-medium tracking-widest uppercase text-accent mb-4">
        The World&apos;s Most ___
      </span>

      {/* Superlative hero */}
      <div className="w-full max-w-lg text-center mb-6">
        <h1 className="text-xl font-bold mb-1">{displayTitle}</h1>
        <p className="text-text-muted text-sm">{displayDesc}</p>
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
