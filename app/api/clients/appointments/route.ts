import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, services, masters, clients } from "@/db/schema";
import { eq, or, and, gte, lt, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const clientIdParam = searchParams.get("clientId");
  const statusParam = searchParams.get("status") ?? "all";
  const futureParam = searchParams.get("future");

  if (!clientIdParam) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const clientId = parseInt(clientIdParam, 10);
  if (isNaN(clientId)) {
    return NextResponse.json({ error: "clientId must be a number" }, { status: 400 });
  }

  // Look up the client to get phone and telegramId
  const client = await db
    .select({ phone: clients.phone, telegramId: clients.telegramId })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (client.length === 0) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { phone, telegramId } = client[0];

  // Build the client match condition (phone or telegramId)
  const clientConditions = [];
  if (phone) {
    clientConditions.push(eq(appointments.clientPhone, phone));
  }
  if (telegramId) {
    clientConditions.push(eq(appointments.clientTelegramId, telegramId));
  }

  if (clientConditions.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  const clientFilter =
    clientConditions.length === 1
      ? clientConditions[0]
      : or(...clientConditions);

  // Compute today's date without timezone bug
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Build combined WHERE conditions
  const filters = [clientFilter!];

  if (statusParam !== "all") {
    filters.push(eq(appointments.status, statusParam));
  }

  if (futureParam === "true") {
    filters.push(gte(appointments.appointmentDate, today));
  } else if (futureParam === "false") {
    filters.push(lt(appointments.appointmentDate, today));
  }

  const whereClause = filters.length === 1 ? filters[0] : and(...filters);

  // Fetch with joins
  const rows = await db
    .select({
      id: appointments.id,
      serviceId: appointments.serviceId,
      serviceName: services.name,
      servicePrice: services.price,
      serviceDuration: services.duration,
      masterId: appointments.masterId,
      masterName: masters.fullName,
      masterSpecialization: masters.specialization,
      masterPhotoUrl: masters.photoUrl,
      appointmentDate: appointments.appointmentDate,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      clientName: appointments.clientName,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(masters, eq(appointments.masterId, masters.id))
    .where(whereClause)
    .orderBy(desc(appointments.appointmentDate), desc(appointments.startTime));

  return NextResponse.json(rows);
}
