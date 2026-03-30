import { NextResponse } from "next/server";
import { db } from "@/db";
import { workSlots, scheduleBlocks, appointments, masters, reminderSent } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MONTHS_RU = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

function getMoscowNow(): Date {
  const now = new Date();
  const moscowStr = now.toLocaleString("en-US", { timeZone: "Europe/Moscow" });
  return new Date(moscowStr);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatDateRu(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}

function getMasterSettings(settingsJson: string | null): Record<string, boolean> {
  const defaults: Record<string, boolean> = {
    newAppointments: true,
    cancellations: true,
    breaks: true,
    morningReminder: false,
  };
  if (!settingsJson) return defaults;
  try {
    return { ...defaults, ...JSON.parse(settingsJson) };
  } catch {
    return defaults;
  }
}

async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const token = process.env.MASTERS_BOT_TOKEN;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const moscowNow = getMoscowNow();
    const todayStr = `${moscowNow.getFullYear()}-${String(moscowNow.getMonth() + 1).padStart(2, "0")}-${String(moscowNow.getDate()).padStart(2, "0")}`;
    const nowMinutes = moscowNow.getHours() * 60 + moscowNow.getMinutes();

    // Get all confirmed work slots for today
    const todaySlots = await db.select().from(workSlots)
      .where(and(eq(workSlots.workDate, todayStr), eq(workSlots.isConfirmed, true)));

    let sent = 0;

    for (const slot of todaySlots) {
      const slotStartMin = timeToMinutes(slot.startTime);

      // Check if slot starts within [now - 5min, now]
      if (slotStartMin < nowMinutes - 5 || slotStartMin > nowMinutes) continue;

      // Deduplication: check reminderSent (use negative masterId as appointmentId)
      const dedupeId = -slot.masterId;
      const existing = await db.select().from(reminderSent)
        .where(and(
          eq(reminderSent.appointmentId, dedupeId),
          eq(reminderSent.reminderType, "master_morning"),
        ));
      // Filter by today's date in sentAt
      const alreadySent = existing.some((r) => r.sentAt.startsWith(todayStr));
      if (alreadySent) continue;

      // Check master settings
      const [master] = await db.select({
        telegramId: masters.telegramId,
        fullName: masters.fullName,
        notificationSettings: masters.notificationSettings,
      }).from(masters).where(eq(masters.id, slot.masterId));

      if (!master?.telegramId) continue;

      const settings = getMasterSettings(master.notificationSettings);
      if (!settings.morningReminder) continue;

      // Collect breaks
      const breaks = await db.select().from(scheduleBlocks)
        .where(and(eq(scheduleBlocks.blockDate, todayStr), eq(scheduleBlocks.masterId, slot.masterId)));

      // Collect confirmed appointments
      const apps = await db.select().from(appointments)
        .where(and(
          eq(appointments.appointmentDate, todayStr),
          eq(appointments.masterId, slot.masterId),
          eq(appointments.status, "confirmed"),
        ));

      // Build message
      const dateFormatted = formatDateRu(todayStr);
      let msg = `📋 Ваш день на сегодня\n\n📅 ${dateFormatted}, ${slot.startTime}–${slot.endTime}`;

      // Breaks section
      if (breaks.length > 0) {
        const breakLines = breaks
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map((b) => `• ${b.startTime}–${b.endTime}`)
          .join("\n");
        msg += `\n\n☕ Перерывы:\n${breakLines}`;
      }

      // Appointments / early finish section
      if (apps.length === 0) {
        msg += "\n\n📝 Записей пока нет";
      } else {
        const lastEndTime = apps
          .map((a) => a.endTime)
          .sort()
          .pop()!;
        const lastEndMin = timeToMinutes(lastEndTime);
        const shiftEndMin = timeToMinutes(slot.endTime);

        if (lastEndMin < shiftEndMin) {
          msg += `\n\n🏁 Последняя запись заканчивается в ${lastEndTime}\n   Свободны с ${lastEndTime} (смена до ${slot.endTime})`;
        }
      }

      // Send
      const ok = await sendTelegram(master.telegramId, msg);
      if (ok) {
        await db.insert(reminderSent).values({
          appointmentId: dedupeId,
          sentAt: new Date().toISOString(),
          reminderType: "master_morning",
        });
        sent++;
        console.log(`Morning notification sent to ${master.fullName}`);
      }
    }

    return NextResponse.json({ ok: true, sent, date: todayStr });
  } catch (error) {
    console.error("master-morning cron error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
