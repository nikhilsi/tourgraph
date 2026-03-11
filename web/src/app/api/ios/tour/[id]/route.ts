import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (!id || id <= 0) {
      return NextResponse.json({ error: "Invalid tour ID" }, { status: 400 });
    }

    const db = getDb(true);
    const row = db
      .prepare(
        "SELECT description, image_urls_json FROM tours WHERE id = ? AND status = 'active'"
      )
      .get(id) as { description: string | null; image_urls_json: string | null } | undefined;

    if (!row) {
      return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        id,
        description: row.description,
        image_urls_json: row.image_urls_json,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      }
    );
  } catch (error) {
    console.error("iOS tour enrichment error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tour data" },
      { status: 500 }
    );
  }
}
