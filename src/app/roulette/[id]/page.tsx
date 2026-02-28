import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getTourById } from "@/lib/db";
import ShareButton from "@/components/ShareButton";
import FeatureNav from "@/components/FeatureNav";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tour = getTourById(Number(id));
  if (!tour) return { title: "Tour Not Found" };

  const description =
    tour.one_liner ||
    `${tour.title} in ${tour.destination_name}, ${tour.country}`;

  return {
    title: `${tour.title} — TourGraph`,
    description,
    openGraph: {
      title: tour.title,
      description,
      images: tour.image_url ? [{ url: tour.image_url }] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: tour.title,
      description,
      images: tour.image_url ? [tour.image_url] : [],
    },
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
}

export default async function TourDetailPage({ params }: Props) {
  const { id } = await params;
  const tour = getTourById(Number(id));

  if (!tour) {
    notFound();
  }

  const inclusions: string[] = tour.inclusions_json
    ? JSON.parse(tour.inclusions_json)
    : [];

  const imageUrls: string[] = tour.image_urls_json
    ? JSON.parse(tour.image_urls_json)
    : [];

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
        {tour.image_url && (
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

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-text-muted">
            {tour.rating && (
              <span className="flex items-center gap-1">
                <span className="text-accent">&#9733;</span>
                {tour.rating.toFixed(1)}
                {tour.review_count && (
                  <span className="text-text-dim">
                    ({tour.review_count.toLocaleString()})
                  </span>
                )}
              </span>
            )}
            {tour.from_price && (
              <span>${Math.round(tour.from_price)}</span>
            )}
            {tour.duration_minutes && (
              <span>{formatDuration(tour.duration_minutes)}</span>
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

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3">
            {tour.viator_url && (
              <a
                href={tour.viator_url}
                target="_blank"
                rel="noopener noreferrer"
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
            <div key={i} className="relative aspect-[3/2] rounded-lg overflow-hidden">
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
          className="py-3 px-8 rounded-xl border border-accent text-accent hover:bg-accent hover:text-black font-bold transition-colors"
        >
          Spin Your Own
        </Link>

        <FeatureNav current="roulette" />
      </div>
    </main>
  );
}
