/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import {
  getDistinctTimezones,
  getRightNowTours,
} from "@/lib/db";
import {
  getGoldenTimezones,
  getPleasantTimezones,
  formatLocalTime,
  getCurrentHour,
  getTimeOfDayLabel,
} from "@/lib/timezone";

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET() {
  const allTimezones = getDistinctTimezones();
  let matchedTzs = getGoldenTimezones(allTimezones);
  if (matchedTzs.length === 0) {
    matchedTzs = getPleasantTimezones(allTimezones);
  }

  const [tour] = getRightNowTours(matchedTzs, 1);
  if (!tour) {
    return new Response("No tours available", { status: 404 });
  }

  const tz = tour.timezone!;
  const localTime = formatLocalTime(tz);
  const label = getTimeOfDayLabel(getCurrentHour(tz));
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
              Right Now Somewhere...
            </span>
          </div>

          <div
            style={{
              fontSize: "28px",
              color: "#f59e0b",
              fontWeight: 600,
              display: "flex",
              marginBottom: "8px",
            }}
          >
            {localTime} · {label}
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
            {tour.title.length > 70
              ? tour.title.slice(0, 67) + "..."
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
