import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { reviews } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const rows = await dbRetry(() => db
      .select()
      .from(reviews)
      .where(eq(reviews.salonId, session.salonId))
      .orderBy(desc(reviews.createdAt))
      .limit(500)
    );
    return NextResponse.json(rows);
  } catch (error) {
    // Table may not exist yet (pre-migration). Treat as empty list.
    const msg = error instanceof Error ? error.message : String(error);
    if (/relation .* does not exist|reviews/i.test(msg)) return NextResponse.json([]);
    console.error("Reviews GET error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const body = await req.json();
    const id = Number(body?.id);
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const reply = typeof body?.partnerReply === "string" ? body.partnerReply.trim() : null;
    const status = typeof body?.status === "string" ? body.status : undefined;

    const update: Record<string, unknown> = {};
    if (reply !== null) {
      update.partnerReply = reply || null;
      update.repliedAt = reply ? new Date() : null;
    }
    if (status === "published" || status === "hidden") update.status = status;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "nothing to update" }, { status: 400 });
    }

    const [row] = await dbRetry(() => db
      .update(reviews)
      .set(update)
      .where(and(eq(reviews.id, id), eq(reviews.salonId, session.salonId)))
      .returning()
    );
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Reviews PATCH error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
