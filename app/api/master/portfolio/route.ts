import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterPortfolio } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { deleteFile } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = parseInt(searchParams.get("masterId") || "0");
    if (!masterId) return NextResponse.json({ error: "masterId required" }, { status: 400 });

    const photos = await db
      .select()
      .from(masterPortfolio)
      .where(eq(masterPortfolio.masterId, masterId))
      .orderBy(desc(masterPortfolio.id));

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Portfolio GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");
    const masterId = parseInt(searchParams.get("masterId") || "0");
    if (!id || !masterId) return NextResponse.json({ error: "id and masterId required" }, { status: 400 });

    const [photo] = await db
      .select()
      .from(masterPortfolio)
      .where(and(eq(masterPortfolio.id, id), eq(masterPortfolio.masterId, masterId)));

    if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const urlParts = photo.imageUrl.split("/portfolio/");
    if (urlParts[1]) {
      await deleteFile("portfolio", urlParts[1]);
    }

    await db.delete(masterPortfolio).where(eq(masterPortfolio.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Portfolio DELETE error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
