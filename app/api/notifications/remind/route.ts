import { NextResponse } from "next/server";

import { db } from "@/db";
import { appointments, masters, reminderSent, services } from "@/db/schema";
import { and, eq, gte, inArray, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDateYYYYMMDD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDateTime(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
}

// Полностью отключенные напоминания: эндпоинт ничего не делает и всегда возвращает, что система напоминаний выключена
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "TELEGRAM_BOT_TOKEN is not set",
        checked: 0,
        sent: 0,
        skipped: 0,
      },
      { status: 500 }
    );
  }

  const now = new Date();
  const targetMs = now.getTime() + 2 * 60 * 60 * 1000;
  const windowFrom = new Date(targetMs - 2 * 60 * 1000);
  const windowTo = new Date(targetMs + 2 * 60 * 1000);

  const minDate = formatDateYYYYMMDD(windowFrom);
  const maxDate = formatDateYYYYMMDD(windowTo);

  const rows = await db
    .select({
      appointmentId: appointments.id,
      appointmentDate: appointments.appointmentDate,
      startTime: appointments.startTime,
      clientName: appointments.clientName,
      clientTelegramId: appointments.clientTelegramId,
      masterName: masters.fullName,
      serviceName: services.name,
    })
    .from(appointments)
    .leftJoin(masters, eq(appointments.masterId, masters.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(
      and(
        eq(appointments.status, "confirmed"),
        gte(appointments.appointmentDate, minDate),
        lte(appointments.appointmentDate, maxDate)
      )
    );

  let checked = 0;
  let sent = 0;
  let skipped = 0;

  const candidates = rows.filter((row) => {
    checked += 1;

    if (!row.clientTelegramId) {
      skipped += 1;
      return false;
    }

    const dt = parseLocalDateTime(row.appointmentDate, row.startTime);
    const ok = dt >= windowFrom && dt <= windowTo;

    if (!ok) {
      skipped += 1;
    }

    return ok;
  });

  const candidateIds = candidates.map((c) => c.appointmentId);

  const alreadySent = candidateIds.length
    ? await db
        .select({ appointmentId: reminderSent.appointmentId })
        .from(reminderSent)
        .where(
          and(
            eq(reminderSent.reminderType, "2hour"),
            inArray(reminderSent.appointmentId, candidateIds)
          )
        )
    : [];

  const alreadySentSet = new Set(alreadySent.map((x) => x.appointmentId));

  for (const row of candidates) {
    if (alreadySentSet.has(row.appointmentId)) {
      skipped += 1;
      continue;
    }

    try {
      const text = `Напоминание: через 2 часа у вас запись.\n\nУслуга: ${row.serviceName || "—"}\nМастер: ${row.masterName || "—"}\nДата: ${row.appointmentDate}\nВремя: ${row.startTime}\n\nЕсли планы изменились — свяжитесь с администратором.`;

      await sendTelegramMessage(token, row.clientTelegramId!, text);

      await db
        .insert(reminderSent)
        .values({ appointmentId: row.appointmentId, reminderType: "2hour" });

      sent += 1;
    } catch (error) {
      console.error("Failed to send reminder:", error);
      skipped += 1;
    }
  }

  return NextResponse.json(
    {
      success: true,
      message: "Reminders processed",
      checked,
      sent,
      skipped,
      window: {
        from: windowFrom.toISOString(),
        to: windowTo.toISOString(),
      },
    },
    { status: 200 }
  );
}

