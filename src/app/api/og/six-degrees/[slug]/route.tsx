import { ImageResponse } from "next/og";
import { getChainBySlug } from "@/lib/db";

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const chain = getChainBySlug(slug);

  if (!chain) {
    return new Response("Chain not found", { status: 404 });
  }

  const stops = chain.chain;
  const stopCount = stops.length;

  // Chain visualization: evenly spaced circles connected by lines
  const chainY = 320;
  const chainPadding = 200;
  const chainWidth = WIDTH - chainPadding * 2;
  const gap = stopCount > 1 ? chainWidth / (stopCount - 1) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0a",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle gradient overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: WIDTH,
            height: HEIGHT,
            display: "flex",
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 60%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "48px",
            flex: 1,
          }}
        >
          {/* Feature label */}
          <div style={{ display: "flex", marginBottom: "20px" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#f59e0b",
              }}
            >
              Six Degrees of Anywhere
            </span>
          </div>

          {/* City pair */}
          <div
            style={{
              fontSize: "52px",
              fontWeight: 800,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginBottom: "16px",
            }}
          >
            <span>{chain.city_from}</span>
            <span style={{ color: "#f59e0b", fontSize: "36px" }}>&rarr;</span>
            <span>{chain.city_to}</span>
          </div>

          {/* Summary quote */}
          <div
            style={{
              fontSize: "22px",
              color: "#cccccc",
              fontStyle: "italic",
              display: "flex",
              textAlign: "center",
              maxWidth: "800px",
              lineHeight: 1.4,
            }}
          >
            &ldquo;
            {chain.summary.length > 120
              ? chain.summary.slice(0, 117) + "..."
              : chain.summary}
            &rdquo;
          </div>
        </div>

        {/* Chain visualization — circles connected by line */}
        <div
          style={{
            position: "absolute",
            top: chainY,
            left: 0,
            width: WIDTH,
            height: 200,
            display: "flex",
          }}
        >
          {/* Connecting line */}
          <div
            style={{
              position: "absolute",
              top: 88,
              left: chainPadding + 12,
              width: chainWidth - 24,
              height: 4,
              backgroundColor: "rgba(245,158,11,0.3)",
              display: "flex",
            }}
          />

          {/* Stop circles with city names */}
          {stops.map((stop, i) => {
            const x = chainPadding + i * gap;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x - 12,
                  top: 76,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 120,
                  marginLeft: -48,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: "#f59e0b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "#000000",
                    }}
                  >
                    {i + 1}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    color: "#999999",
                    marginTop: "8px",
                    textAlign: "center",
                    display: "flex",
                  }}
                >
                  {stop.city.length > 12
                    ? stop.city.slice(0, 10) + ".."
                    : stop.city}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "32px 48px",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              color: "#666666",
              display: "flex",
            }}
          >
            {stopCount} stops connected by theme
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
    ),
    { width: WIDTH, height: HEIGHT }
  );
}
