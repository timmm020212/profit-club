import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterClientNotes } from "@/db/schema-postgres";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { masterId, clientIdentifier, note } = await request.json();
    if (!masterId || !clientIdentifier) {
      return NextResponse.json({ error: "masterId and clientIdentifier required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    const existing = await db
      .select({ id: masterClientNotes.id })
      .from(masterClientNotes)
      .where(and(eq(masterClientNotes.masterId, masterId), eq(masterClientNotes.clientIdentifier, clientIdentifier)));

    if (existing.length > 0) {
      await db
        .update(masterClientNotes)
        .set({ note, updatedAt: now })
        .where(eq(masterClientNotes.id, existing[0].id));
    } else {
      await db.insert(masterClientNotes).values({
        masterId,
        clientIdentifier,
        note,
        updatedAt: now,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Client note error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
