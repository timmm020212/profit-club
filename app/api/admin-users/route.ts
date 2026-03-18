import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
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
