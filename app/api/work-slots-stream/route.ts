import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdminSession";
import { db } from "@/db";
import { workSlots, masters } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Server-Sent Events для реального времени обновления статусов
export async function GET(request: Request) {
  // Auth gate at connection open
  const { session, response } = await requireAdminSession("schedule");
  if (response) return response;

  // Temporarily disabled due to controller issues
  return new Response("Stream temporarily disabled", {
    status: 503,
    headers: { "Content-Type": "text/plain" }
  });
}
