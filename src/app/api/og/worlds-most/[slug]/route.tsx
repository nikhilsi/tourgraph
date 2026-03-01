/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { getSuperlative } from "@/lib/db";
import { formatPrice, formatDurationShort } from "@/lib/format";
import type { SuperlativeType, TourRow } from "@/lib/types";

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;

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
    statFn: (t) => `${(t.rating ?? 0).toFixed(1)} stars`,
  },
};

function isValidSlug(slug: string): slug is SuperlativeType {
  return VALID_SLUGS.includes(slug as SuperlativeType);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!isValidSlug(slug)) {
    return new Response("Invalid superlative type", { status: 404 });
  }

  const tour = getSuperlative(slug);
  if (!tour) {
    return new Response("No tour found for this superlative", { status: 404 });
  }

  const display = SUPERLATIVE_DISPLAY[slug];
  const stat = display.statFn(tour);
  const location = [tour.destination_name, tour.country]
    .filter(Boolean)
    .join(", ");

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          position: "relative",
          backgroundColor: "#0a0a0a",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {tour.image_url && (
          <img
            src={tour.image_url}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: WIDTH,
              height: HEIGHT,
              objectFit: "cover",
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: WIDTH,
            height: HEIGHT,
            display: "flex",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            padding: "48px",
          }}
        >
          <div style={{ display: "flex", marginBottom: "16px" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#f59e0b",
              }}
            >
              The World&apos;s Most ___
            </span>
          </div>

          <div
            style={{
              fontSize: "24px",
              color: "#ffffff",
              fontWeight: 600,
              display: "flex",
              marginBottom: "4px",
            }}
          >
            {display.title}
          </div>

          <div
            style={{
              fontSize: "36px",
              color: "#f59e0b",
              fontWeight: 800,
              display: "flex",
              marginBottom: "12px",
            }}
          >
            {stat}
          </div>

          <div
            style={{
              fontSize: "42px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.15,
              display: "flex",
              maxWidth: "900px",
            }}
          >
            {tour.title.length > 60
              ? tour.title.slice(0, 57) + "..."
              : tour.title}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                color: "#cccccc",
                display: "flex",
              }}
            >
              {location}
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#ffffff",
                opacity: 0.7,
                display: "flex",
              }}
            >
              tourgraph.ai
            </div>
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}
