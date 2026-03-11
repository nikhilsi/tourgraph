/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getTourDetail } from "@/lib/api";

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;

function parseAndValidateId(raw: string): number | null {
  const id = parseInt(raw, 10);
  if (isNaN(id) || id <= 0 || id > 2147483647) return null;
  return id;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseAndValidateId(id);
  if (!numId) {
    return new Response("Not found", { status: 404 });
  }

  const tour = await getTourDetail(numId);
  if (!tour) {
    return new Response("Not found", { status: 404 });
  }

  const rating = tour.rating ? `${tour.rating.toFixed(1)} ★` : "";
  const price = tour.fromPrice ? `$${Math.round(tour.fromPrice)}` : "";
  const location = [tour.destinationName, tour.country]
    .filter(Boolean)
    .join(", ");
  const stats = [rating, price].filter(Boolean).join("  ·  ");

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
        {tour.imageUrl && (
          <img
            src={tour.imageUrl}
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
              Tour Roulette
            </span>
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
            {tour.title.length > 80
              ? tour.title.slice(0, 77) + "..."
              : tour.title}
          </div>

          <div
            style={{
              fontSize: "20px",
              color: "#cccccc",
              marginTop: "12px",
              display: "flex",
            }}
          >
            {location}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "20px",
            }}
          >
            <div
              style={{
                fontSize: "22px",
                color: "#f59e0b",
                fontWeight: 600,
                display: "flex",
              }}
            >
              {stats}
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
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}
