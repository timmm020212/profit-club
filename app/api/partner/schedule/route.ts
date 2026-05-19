import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { workSlots, masters, appointments } from "@/db/schema";
import { and, eq, gte, lte, inArray, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidDate(s: unknown): s is string {
  return typeof s === "string" && DATE_RE.test(s);
}
function isValidTime(s: unknown): s is string {
  return typeof s === "string" && TIME_RE.test(s);
}

async function ownsMaster(masterId: number, salonId: number) {
  const [row] = await dbRetry(() => db
    .select({ id: masters.id })
    .from(masters)
    .where(and(eq(masters.id, masterId), eq(masters.salonId, salonId)))
    .limit(1)
  );
  return !!row;
}

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD
// → { slots: [...], counts: { "masterId-date": number } }
export async function GET(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  if (!isValidDate(from) || !isValidDate(to)) {
    return NextResponse.json({ error: "from/to (YYYY-MM-DD) обязательны" }, { status: 400 });
  }

  try {
    const salonMasters = await dbRetry(() => db
      .select({ id: masters.id })
      .from(masters)
      .where(and(eq(masters.salonId, session.salonId), eq(masters.isActive, true)))
    );
    const masterIds = salonMasters.map(m => m.id);
    if (masterIds.length === 0) {
      return NextResponse.json({ slots: [], counts: {} });
    }

    const [slots, appts] = await Promise.all([
      dbRetry(() => db
        .select({
          id: workSlots.id,
          masterId: workSlots.masterId,
          workDate: workSlots.workDate,
          startTime: workSlots.startTime,
          endTime: workSlots.endTime,
          isConfirmed: workSlots.isConfirmed,
        })
        .from(workSlots)
        .where(and(
          inArray(workSlots.masterId, masterIds),
          gte(workSlots.workDate, from),
          lte(workSlots.workDate, to),
        ))
      ),
      dbRetry(() => db
        .select({
          masterId: appointments.masterId,
          appointmentDate: appointments.appointmentDate,
          status: appointments.status,
        })
        .from(appointments)
        .where(and(
          inArray(appointments.masterId, masterIds),
          gte(appointments.appointmentDate, from),
          lte(appointments.appointmentDate, to),
          ne(appointments.status, "cancelled"),
        ))
      ),
    ]);

    const counts: Record<string, number> = {};
    for (const a of appts) {
      const key = `${a.masterId}-${a.appointmentDate}`;
      counts[key] = (counts[key] || 0) + 1;
    }

    return NextResponse.json({ slots, counts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Schedule GET error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

// POST { masterId, dates: string[], startTime, endTime }
// Bulk upsert: creates/updates workSlots for given dates, auto-confirms (partner is the authority).
export async function POST(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  try {
    const body = await request.json();
    const { masterId: masterIdRaw, dates, startTime, endTime } = body;
    const masterId = Number(masterIdRaw);

    if (!Number.isFinite(masterId) || masterId <= 0) {
      return NextResponse.json({ error: "masterId обязателен" }, { status: 400 });
    }
    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "dates обязательны" }, { status: 400 });
    }
    for (const d of dates) {
      if (!isValidDate(d)) {
        return NextResponse.json({ error: `Неверная дата: ${d}` }, { status: 400 });
      }
    }
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return NextResponse.json({ error: "Неверный формат времени (HH:MM)" }, { status: 400 });
    }
    if (startTime >= endTime) {
      return NextResponse.json({ error: "Время начала должно быть раньше конца" }, { status: 400 });
    }

    if (!(await ownsMaster(masterId, session.salonId))) {
      return NextResponse.json({ error: "Мастер не найден" }, { status: 404 });
    }

    const uniqueDates = Array.from(new Set(dates));

    const existing = await dbRetry(() => db
      .select({ id: workSlots.id, workDate: workSlots.workDate })
      .from(workSlots)
      .where(and(
        eq(workSlots.masterId, masterId),
        inArray(workSlots.workDate, uniqueDates),
      ))
    );
    const existingByDate = new Map(existing.map(s => [s.workDate, s.id]));

    const nowIso = new Date().toISOString();

    for (const date of uniqueDates) {
      const existingId = existingByDate.get(date);
      if (existingId) {
        await dbRetry(() => db.update(workSlots)
          .set({ startTime, endTime, isConfirmed: true, adminUpdateStatus: null })
          .where(eq(workSlots.id, existingId))
        );
      } else {
        await dbRetry(() => db.insert(workSlots).values({
          masterId,
          workDate: date,
          startTime,
          endTime,
          isConfirmed: true,
          createdAt: nowIso,
          createdBy: "partner",
          salonId: session.salonId,
        }));
      }
    }

    return NextResponse.json({ ok: true, updated: uniqueDates.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Schedule POST error:", msg);
    return NextResponse.json({ error: "Не удалось сохранить расписание", detail: msg }, { status: 500 });
  }
}

// DELETE ?masterId=X&dates=YYYY-MM-DD,YYYY-MM-DD
// (or ?date=YYYY-MM-DD for single)
export async function DELETE(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const { searchParams } = new URL(request.url);
  const masterId = Number(searchParams.get("masterId"));
  const datesParam = searchParams.get("dates");
  const dateParam = searchParams.get("date");

  if (!Number.isFinite(masterId) || masterId <= 0) {
    return NextResponse.json({ error: "masterId обязателен" }, { status: 400 });
  }

  const rawDates = datesParam
    ? datesParam.split(",").map(s => s.trim()).filter(Boolean)
    : dateParam
      ? [dateParam]
      : [];
  const dates = rawDates.filter(isValidDate);
  if (dates.length === 0) {
    return NextResponse.json({ error: "date(s) обязательны" }, { status: 400 });
  }

  try {
    if (!(await ownsMaster(masterId, session.salonId))) {
      return NextResponse.json({ error: "Мастер не найден" }, { status: 404 });
    }

    await dbRetry(() => db.delete(workSlots).where(and(
      eq(workSlots.masterId, masterId),
      inArray(workSlots.workDate, dates),
    )));

    return NextResponse.json({ ok: true, deleted: dates.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Schedule DELETE error:", msg);
    return NextResponse.json({ error: "Не удалось удалить", detail: msg }, { status: 500 });
  }
}
