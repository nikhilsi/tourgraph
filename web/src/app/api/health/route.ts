import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb(true);
    const row = db.prepare("SELECT COUNT(*) as c FROM tours WHERE status = 'active'").get() as { c: number };
    return NextResponse.json({ status: "ok", tours: row.c });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
