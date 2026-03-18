import { NextResponse } from "next/server";
import { db } from "@/db/index-sqlite";
import { workSlots, masters } from "@/db/schema-sqlite";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Server-Sent Events для реального времени обновления статусов (без авторизации для внутреннего использования)
export async function GET(request: Request) {
  // Временно отключаем этот endpoint из-за проблем с контроллерами
  return new Response("Stream temporarily disabled", { 
    status: 503,
    headers: { "Content-Type": "text/plain" }
  });
}
