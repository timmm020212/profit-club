import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdminSession";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const adminUsers = await db
      .select({
        id: admins.id,
        username: admins.username,
        name: admins.name,
      })
      .from(admins)
      .where(eq(admins.isActive, true))
      .orderBy(admins.name);

    return NextResponse.json(adminUsers);
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin users" },
      { status: 500 }
    );
  }
}
