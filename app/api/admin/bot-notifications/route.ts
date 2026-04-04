import { NextResponse } from "next/server";
import { db } from "@/db";
import { botNotificationTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_TEMPLATES } from "@/lib/bot-templates";
import { requireAdminSession } from "@/lib/requireAdminSession";

export const dynamic = "force-dynamic";

async function seedMissing() {
  const existing = await db.select({ slug: botNotificationTemplates.slug })
    .from(botNotificationTemplates);
  const existingSlugs = new Set(existing.map(e => e.slug));

  for (const t of DEFAULT_TEMPLATES) {
    if (existingSlugs.has(t.slug)) continue;
    await db.insert(botNotificationTemplates).values({
      slug: t.slug,
      botType: t.botType,
      name: t.name,
      messageTemplate: t.messageTemplate,
      isEnabled: t.isEnabled,
      variables: JSON.stringify(t.variables),
    });
  }
}

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await seedMissing();
    const { searchParams } = new URL(request.url);
    const botType = searchParams.get("botType");

    const conditions = botType ? eq(botNotificationTemplates.botType, botType) : undefined;
    const templates = await db.select().from(botNotificationTemplates).where(conditions);

    return NextResponse.json(templates.map(t => ({
      ...t,
      variables: JSON.parse(t.variables),
    })));
  } catch (error) {
    console.error("Error fetching notification templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}
