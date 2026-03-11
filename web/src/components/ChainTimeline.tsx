import Image from "next/image";
import Link from "next/link";
import { formatDurationShort } from "@/lib/format";
import type { ChainLink } from "@/lib/types";
import type { RouletteTour } from "@/lib/api";

interface ChainTimelineProps {
  chain: ChainLink[];
  tourData: (RouletteTour | undefined)[];
}

export default function ChainTimeline({ chain, tourData }: ChainTimelineProps) {
  return (
    <div className="w-full max-w-md">
      {chain.map((link, i) => {
        const tour = tourData[i];
        const isLast = i === chain.length - 1;

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
                {tour.imageUrl && (
                  <div className="relative aspect-[3/2]">
                    <Image
                      src={tour.imageUrl}
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
                  {tour.oneLiner && (
                    <p className="text-xs text-text-muted mt-1 leading-snug italic line-clamp-2">
                      {tour.oneLiner}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-text-muted mt-1.5">
                    {tour.rating > 0 && (
                      <span className="flex items-center gap-1" title={`${tour.rating.toFixed(1)} out of 5 stars`}>
                        <span className="text-accent">&#9733;</span>
                        {tour.rating.toFixed(1)}
                      </span>
                    )}
                    {tour.fromPrice > 0 && (
                      <span title={`Starting from $${Math.round(tour.fromPrice)}`}>${Math.round(tour.fromPrice)}</span>
                    )}
                    {tour.durationMinutes > 0 && (
                        <span title={`Tour duration: ${formatDurationShort(tour.durationMinutes)}`}>
                          {formatDurationShort(tour.durationMinutes)}
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
  );
}
