import Image from "next/image";
import Link from "next/link";
import type { RouletteTour } from "@/lib/types";
import { formatDurationShort } from "@/lib/format";
import ShareButton from "./ShareButton";

export default function TourCard({
  tour,
  priority = true,
}: {
  tour: RouletteTour;
  priority?: boolean;
}) {
  return (
    <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden bg-surface">
      {/* Photo — tappable to detail page */}
      <Link href={`/roulette/${tour.id}`} className="block relative aspect-[3/2]">
        {tour.imageUrl ? (
          <Image
            src={tour.imageUrl}
            alt={tour.title}
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            className="object-cover"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full bg-surface-hover flex items-center justify-center">
            <span className="text-text-dim text-sm">No photo</span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Title */}
        <Link href={`/roulette/${tour.id}`}>
          <h2 className="text-xl font-bold leading-tight line-clamp-2 hover:text-accent transition-colors">
            {tour.title}
          </h2>
        </Link>

        {/* Location */}
        <p className="text-sm text-text-muted">
          {tour.destinationName}
          {tour.country ? `, ${tour.country}` : ""}
        </p>

        {/* One-liner */}
        {tour.oneLiner && (
          <p className="text-sm italic text-text-muted leading-snug line-clamp-2">
            &ldquo;{tour.oneLiner}&rdquo;
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-sm text-text-muted pt-1">
          {tour.rating > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-accent">&#9733;</span>
              {tour.rating.toFixed(1)}
            </span>
          )}
          {tour.fromPrice > 0 && (
            <span>${Math.round(tour.fromPrice)}</span>
          )}
          {tour.durationMinutes > 0 && (
            <span>{formatDurationShort(tour.durationMinutes)}</span>
          )}
        </div>

        {/* Share button */}
        <div className="pt-1">
          <ShareButton tourId={tour.id} title={tour.title} oneLiner={tour.oneLiner} />
        </div>
      </div>
    </div>
  );
}
