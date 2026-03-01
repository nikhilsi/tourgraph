import { cache } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getChainBySlug, getTourById } from "@/lib/db";
import { formatDurationShort } from "@/lib/format";
import ShareButton from "@/components/ShareButton";
import FeatureNav from "@/components/FeatureNav";

interface Props {
  params: Promise<{ slug: string }>;
}

const getCachedChain = cache((slug: string) => getChainBySlug(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const chain = getCachedChain(slug);
  if (!chain) return { title: "Chain Not Found" };

  const description = chain.summary;
  const title = `${chain.city_from} to ${chain.city_to} — Six Degrees`;
  const ogImage = `/api/og/six-degrees/${slug}`;

  return {
    title: `${title} — TourGraph`,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ChainDetailPage({ params }: Props) {
  const { slug } = await params;
  const chain = getCachedChain(slug);
  if (!chain) notFound();

  // Look up tour data for each stop
  const tourData = chain.chain.map((link) => getTourById(link.tour_id));

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      {/* Brand */}
      <Link
        href="/"
        className="text-2xl font-bold tracking-tight mb-2 hover:text-accent transition-colors"
      >
        TourGraph
      </Link>

      <Link
        href="/six-degrees"
        className="text-xs font-medium tracking-widest uppercase text-accent mb-4 hover:underline"
      >
        Six Degrees of Anywhere
      </Link>

      {/* Chain header */}
      <div className="text-center mb-8 max-w-md">
        <h1 className="text-2xl font-bold">
          {chain.city_from} &rarr; {chain.city_to}
        </h1>
        <p className="text-sm italic text-text-muted mt-2 leading-snug">
          &ldquo;{chain.summary}&rdquo;
        </p>
      </div>

      {/* Timeline */}
      <div className="w-full max-w-md">
        {chain.chain.map((link, i) => {
          const tour = tourData[i];
          const isLast = i === chain.chain.length - 1;

          return (
            <div key={i} className="relative pl-8">
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-text-dim/30" />
              )}

              {/* Circle node */}
              <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                <span className="text-xs font-bold text-black">
                  {i + 1}
                </span>
              </div>

              {/* City label */}
              <div className="pb-3">
                <h2 className="text-base font-bold">
                  {link.city}, {link.country}
                </h2>
              </div>

              {/* Tour card */}
              {tour && (
                <Link
                  href={`/roulette/${tour.id}`}
                  className="block rounded-xl bg-surface overflow-hidden mb-3 hover:bg-surface-hover transition-colors"
                >
                  {tour.image_url && (
                    <div className="relative aspect-[3/2]">
                      <Image
                        src={tour.image_url}
                        alt={tour.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 448px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="text-sm font-semibold leading-tight line-clamp-2">
                      {tour.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-1.5">
                      {tour.rating != null && tour.rating > 0 && (
                        <span className="flex items-center gap-1" title={`${tour.rating.toFixed(1)} out of 5 stars`}>
                          <span className="text-accent">&#9733;</span>
                          {tour.rating.toFixed(1)}
                        </span>
                      )}
                      {tour.from_price != null && tour.from_price > 0 && (
                        <span title={`Starting from $${Math.round(tour.from_price)}`}>${Math.round(tour.from_price)}</span>
                      )}
                      {tour.duration_minutes != null &&
                        tour.duration_minutes > 0 && (
                          <span title={`Tour duration: ${formatDurationShort(tour.duration_minutes)}`}>
                            {formatDurationShort(tour.duration_minutes)}
                          </span>
                        )}
                    </div>
                  </div>
                </Link>
              )}

              {/* Fallback if tour not found in DB */}
              {!tour && (
                <div className="rounded-xl bg-surface p-3 mb-3">
                  <h3 className="text-sm font-semibold leading-tight line-clamp-2">
                    {link.tour_title}
                  </h3>
                </div>
              )}

              {/* Connection to next stop */}
              {!isLast && link.connection_to_next && (
                <div className="pb-6 pt-1">
                  <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-accent/15 text-accent mb-2">
                    {link.theme}
                  </span>
                  <p className="text-sm italic text-text-muted leading-snug">
                    {link.connection_to_next}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 mt-8">
        <div className="flex items-center gap-3">
          <Link
            href="/six-degrees"
            className="py-3 px-6 rounded-xl border border-accent text-accent hover:bg-accent hover:text-black font-bold transition-colors"
          >
            Explore Another
          </Link>
          <ShareButton
            tourId={chain.id}
            title={`${chain.city_from} to ${chain.city_to}`}
            oneLiner={chain.summary}
          />
        </div>
        <Link
          href="/"
          title="Discover a random tour from anywhere in the world"
          className="text-sm text-text-muted hover:text-accent transition-colors"
        >
          Spin Your Own &rarr;
        </Link>
      </div>

      <div className="mt-8">
        <FeatureNav current="six-degrees" />
      </div>
    </main>
  );
}
