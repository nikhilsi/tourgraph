import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const MAX_BATCH_SIZE = 50;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ids: number[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }

    // Cap batch size and validate IDs
    const validIds = ids
      .slice(0, MAX_BATCH_SIZE)
      .filter((n) => typeof n === "number" && n > 0 && Number.isInteger(n));

    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid IDs" }, { status: 400 });
    }

    const db = getDb(true);
    const placeholders = validIds.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT id, description, image_urls_json FROM tours
         WHERE id IN (${placeholders}) AND status = 'active'`
      )
      .all(...validIds) as { id: number; description: string | null; image_urls_json: string | null }[];

    return NextResponse.json({ tours: rows });
  } catch (error) {
    console.error("iOS batch enrichment error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tour data" },
      { status: 500 }
    );
  }
}
