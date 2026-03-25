import { NextResponse } from "next/server";
import { db } from "@/db";
import { botNotificationTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const updates: any = { updatedAt: new Date() };

    if (body.messageTemplate !== undefined) updates.messageTemplate = body.messageTemplate;
    if (body.isEnabled !== undefined) updates.isEnabled = body.isEnabled;

    const result = await db.update(botNotificationTemplates)
      .set(updates)
      .where(eq(botNotificationTemplates.slug, slug))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result[0],
      variables: JSON.parse(result[0].variables),
    });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}
