import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getRandomChain, getTourById } from "@/lib/db";
import { formatDurationShort } from "@/lib/format";
import ShareButton from "@/components/ShareButton";
import FeatureNav from "@/components/FeatureNav";
import Logo from "@/components/Logo";
import SurpriseMeButton from "./SurpriseMeButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Six Degrees of Anywhere — TourGraph",
  description:
    "Every city is connected. Find the surprising thematic links between tours around the world.",
  openGraph: {
    title: "Six Degrees of Anywhere",
    description:
      "Every city is connected. Find the surprising thematic links between tours around the world.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Six Degrees of Anywhere",
    description:
      "Every city is connected. Find the surprising links.",
  },
};

export default function SixDegreesGalleryPage() {
  const chain = getRandomChain();

  if (!chain) {
    return (
      <main className="flex flex-col items-center min-h-screen py-8 px-4">
        <Logo className="mb-2" />
        <span className="text-xs font-medium tracking-widest uppercase text-accent mb-2">
          Six Degrees of Anywhere
        </span>
        <p className="text-text-dim text-sm mt-8">
          Chains are being generated. Check back soon.
        </p>
        <div className="mt-8">
          <FeatureNav current="six-degrees" />
        </div>
      </main>
    );
  }

  const tourData = chain.chain.map((link) => getTourById(link.tour_id));

  return (
    <main className="flex flex-col items-center min-h-screen py-8 px-4">
      <Logo className="mb-2" />

      <span className="text-xs font-medium tracking-widest uppercase text-accent mb-2">
        Six Degrees of Anywhere
      </span>

      <p className="text-sm text-text-muted text-center max-w-sm mb-8">
        Every city is connected through surprising thematic links.
      </p>

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
                    {tour.one_liner && (
                      <p className="text-xs text-text-muted mt-1 leading-snug italic line-clamp-2">
                        {tour.one_liner}
                      </p>
                    )}
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
      <div className="flex items-center gap-3 mt-8">
        <SurpriseMeButton />
        <ShareButton
          title={`${chain.city_from} to ${chain.city_to}`}
          oneLiner={chain.summary}
          url={`/six-degrees/${chain.slug}`}
        />
      </div>

      <div className="mt-8">
        <FeatureNav current="six-degrees" />
      </div>
    </main>
  );
}
