import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, workSlots, masters, services, clients, scheduleOptimizations, optimizationMoves, serviceVariants } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";


// GET /api/appointments?masterId=1&date=2024-12-25 - получить записи
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get("masterId");
    const date = searchParams.get("date");

    const conditions: any[] = [];

    if (masterId) {
      const masterIdNum = parseInt(masterId);
      if (!isNaN(masterIdNum)) {
        conditions.push(eq(appointments.masterId, masterIdNum));
      }
    }

    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(date)) {
        conditions.push(eq(appointments.appointmentDate, date));
      }
    }

    // Получаем только подтвержденные записи
    conditions.push(eq(appointments.status, "confirmed"));

    const appointmentList = await db
      .select({
        id: appointments.id,
        masterId: appointments.masterId,
        masterName: masters.fullName,
        serviceId: appointments.serviceId,
        serviceName: services.name,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        status: appointments.status,
      })
      .from(appointments)
      .innerJoin(masters, eq(appointments.masterId, masters.id))
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json(appointmentList);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

// PATCH /api/appointments - обновление записи администратором
export async function PATCH(request: Request) {
  try {

    const body = await request.json();
    const { id, masterId, serviceId, appointmentDate, startTime } = body;

    const idNum = Number(id);
    const masterIdNum = Number(masterId);

    if (!id || Number.isNaN(idNum)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    if (!masterId || !serviceId || !appointmentDate || !startTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (Number.isNaN(masterIdNum)) {
      return NextResponse.json({ error: "Invalid masterId" }, { status: 400 });
    }

    const service = await db
      .select()
      .from(services)
      .where(eq(services.id, serviceId));

    if (service.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;

    if (!dateRegex.test(String(appointmentDate))) {
      return NextResponse.json({ error: "Неверный формат даты" }, { status: 400 });
    }

    if (!timeRegex.test(String(startTime))) {
      return NextResponse.json({ error: "Неверный формат времени" }, { status: 400 });
    }

    const [hours, minutes] = startTime.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return NextResponse.json({ error: "Неверное время" }, { status: 400 });
    }
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service[0].duration;

    if (!Number.isFinite(endMinutes) || endMinutes > 24 * 60) {
      return NextResponse.json(
        { error: "Запись выходит за пределы дня (слишком позднее время)" },
        { status: 400 }
      );
    }
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, "0")}:${endMins
      .toString()
      .padStart(2, "0")}`;

    // Проверяем попадание в рабочее время (логика как при создании записи)
    const workDays = await db
      .select()
      .from(workSlots)
      .where(
        and(
          eq(workSlots.masterId, masterIdNum),
          eq(workSlots.workDate, appointmentDate),
          eq(workSlots.isConfirmed, true),
        )
      );

    const now = new Date();
    const todayMidnight = new Date(now.toISOString().slice(0, 10) + "T00:00:00");
    const appointmentDateObj = new Date(String(appointmentDate) + "T00:00:00");
    const diffMs = appointmentDateObj.getTime() - todayMidnight.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const salonStart = "08:00";
    const salonEnd = "20:00";

    if (diffDays <= 1) {
      if (!workDays.length) {
        return NextResponse.json(
          { error: "Нельзя перенести запись: у мастера нет подтверждённого рабочего дня на выбранную дату" },
          { status: 400 }
        );
      }

      const isWithinWorkingHours = workDays.some((slot) => {
        const workStart = slot.startTime;
        const workEnd = slot.endTime;
        return !(startTime < workStart || endTime > workEnd);
      });

      if (!isWithinWorkingHours) {
        const ranges = workDays.map((s) => `${s.startTime}–${s.endTime}`).join(", ");
        return NextResponse.json(
          { error: `Нельзя перенести запись: время ${startTime}–${endTime} вне рабочего дня мастера (${ranges})` },
          { status: 400 }
        );
      }
    } else {
      if (workDays.length > 0) {
        const isWithinWorkingHours = workDays.some((slot) => {
          const workStart = slot.startTime;
          const workEnd = slot.endTime;
          return !(startTime < workStart || endTime > workEnd);
        });

        if (!isWithinWorkingHours) {
          const ranges = workDays.map((s) => `${s.startTime}–${s.endTime}`).join(", ");
          return NextResponse.json(
            { error: `Нельзя перенести запись: время ${startTime}–${endTime} вне рабочего дня мастера (${ranges})` },
            { status: 400 }
          );
        }
      } else {
        const isWithinSalonHours = !(startTime < salonStart || endTime > salonEnd);
        if (!isWithinSalonHours) {
          return NextResponse.json(
            { error: "Нельзя перенести запись: время вне рабочих часов салона (08:00–20:00)" },
            { status: 400 }
          );
        }
      }
    }

    // Проверяем пересечения только по подтверждённым записям, исключая текущую
    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.masterId, masterIdNum),
          eq(appointments.appointmentDate, appointmentDate),
          eq(appointments.status, "confirmed"),
          ne(appointments.id, idNum)
        )
      );

    function timeRangesOverlap(
      start1: string,
      end1: string,
      start2: string,
      end2: string
    ): boolean {
      return start1 < end2 && start2 < end1;
    }

    for (const existing of existingAppointments) {
      if (timeRangesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
        return NextResponse.json(
          { error: "Time slot is already booked" },
          { status: 400 }
        );
      }
    }

    const updated = await db
      .update(appointments)
      .set({
        masterId: masterIdNum,
        serviceId,
        appointmentDate,
        startTime,
        endTime,
      })
      .where(eq(appointments.id, idNum))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Для админа не отправляем никаких уведомлений, изменения применяются сразу
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments?id=123 - удаление записи администратором
export async function DELETE(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const idNum = Number(id);
    if (Number.isNaN(idNum)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const deleted = await db
      .delete(appointments)
      .where(eq(appointments.id, idNum))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Жёсткое удаление без уведомлений и подтверждений
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 }
    );
  }
}

// Helper: converts "HH:MM" to total minutes
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// POST /api/appointments - создать новую запись
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      masterId,
      serviceId,
      variantId,
      appointmentDate,
      startTime,
      clientName,
      clientPhone,
      clientTelegramId,
    } = body;

    const masterIdNum = Number(masterId);

    // Валидация обязательных полей
    if (!masterId || !serviceId || !appointmentDate || !startTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (Number.isNaN(masterIdNum)) {
      return NextResponse.json(
        { error: "Invalid masterId" },
        { status: 400 }
      );
    }

    // Получаем информацию об услуге для расчета времени окончания
    const service = await db
      .select()
      .from(services)
      .where(eq(services.id, serviceId));

    if (service.length === 0) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Рассчитываем время окончания
    const serviceDuration = service[0].duration;
    let effectiveDuration = serviceDuration;
    if (variantId) {
      const [variant] = await db.select({ duration: serviceVariants.duration }).from(serviceVariants).where(eq(serviceVariants.id, variantId));
      if (variant) effectiveDuration = variant.duration;
    }

    const [hours, minutes] = startTime.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + effectiveDuration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;

    // Получаем подтверждённые рабочие дни мастера на эту дату
    const workDays = await db
      .select()
      .from(workSlots)
      .where(
        and(
          eq(workSlots.masterId, masterIdNum),
          eq(workSlots.workDate, appointmentDate),
          eq(workSlots.isConfirmed, true)
        )
      );

    // Считаем разницу в днях между сегодня и датой визита
    const now = new Date();
    const todayMidnight = new Date(now.toISOString().slice(0, 10) + "T00:00:00");
    const appointmentDateObj = new Date(appointmentDate + "T00:00:00");
    const diffMs = appointmentDateObj.getTime() - todayMidnight.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Общие рабочие часы салона
    const salonStart = "08:00";
    const salonEnd = "20:00";

    if (diffDays <= 1) {
      // Сегодня / завтра: запись возможна только по уже составленному расписанию (подтверждённые рабочие дни)
      if (workDays.length === 0) {
        return NextResponse.json(
          { error: "Master is not working on this date" },
          { status: 400 }
        );
      }

      const isWithinWorkingHours = workDays.some((slot) => {
        const workStart = slot.startTime;
        const workEnd = slot.endTime;
        return !(startTime < workStart || endTime > workEnd);
      });

      if (!isWithinWorkingHours) {
        return NextResponse.json(
          { error: "Appointment time is outside working hours" },
          { status: 400 }
        );
      }
    } else {
      // За 3+ дней до визита: можно записаться даже без готового расписания,
      // но только в рабочее время салона и, при наличии расписания, в его рамках
      if (workDays.length > 0) {
        const isWithinWorkingHours = workDays.some((slot) => {
          const workStart = slot.startTime;
          const workEnd = slot.endTime;
          return !(startTime < workStart || endTime > workEnd);
        });

        if (!isWithinWorkingHours) {
          return NextResponse.json(
            { error: "Appointment time is outside working hours" },
            { status: 400 }
          );
        }
      } else {
        const isWithinSalonHours = !(startTime < salonStart || endTime > salonEnd);
        if (!isWithinSalonHours) {
          return NextResponse.json(
            { error: "Appointment time is outside salon working hours (08:00–20:00)" },
            { status: 400 }
          );
        }
      }
    }

    // Проверяем, нет ли пересечения с существующими записями
    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.masterId, masterIdNum),
          eq(appointments.appointmentDate, appointmentDate),
          eq(appointments.status, "confirmed")
        )
      );

    // Функция для проверки пересечения
    function timeRangesOverlap(
      start1: string,
      end1: string,
      start2: string,
      end2: string
    ): boolean {
      return start1 < end2 && start2 < end1;
    }

    for (const existing of existingAppointments) {
      if (timeRangesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
        return NextResponse.json(
          { error: "Time slot is already booked" },
          { status: 400 }
        );
      }
    }

    // Получаем информацию о мастере для уведомления
    const masterInfo = await db
      .select()
      .from(masters)
      .where(eq(masters.id, masterIdNum));

    // Используем переданный Telegram ID (от зарегистрированного пользователя)
    // НЕ ищем по телефону - Telegram ID должен быть передан из сессии пользователя
    let finalTelegramId = clientTelegramId as string | null;
    let finalClientName: string = (clientName as string | undefined)?.trim() || "Гость";
    let finalClientPhone: string | null = clientPhone || null;

    if (finalTelegramId) {
      console.log(`Using Telegram ID from request: ${finalTelegramId}`);
      try {
        const existingClient = await db
          .select()
          .from(clients)
          .where(eq(clients.telegramId, finalTelegramId));

        if (existingClient.length > 0) {
          finalClientName = existingClient[0].name || finalClientName;
          if (!finalClientPhone && existingClient[0].phone) {
            finalClientPhone = existingClient[0].phone;
          }
        } else if (finalClientName && finalClientPhone) {
          // Auto-register client from Mini App booking
          try {
            await db.insert(clients).values({
              name: finalClientName,
              phone: finalClientPhone,
              telegramId: finalTelegramId,
              isVerified: true,
              createdAt: new Date().toISOString(),
              verifiedAt: new Date().toISOString(),
            });
            console.log(`Auto-registered client: ${finalClientName}, tgId=${finalTelegramId}`);
          } catch (regErr) {
            // Ignore duplicate — client may have been registered between check and insert
            console.error("Auto-registration error (may be duplicate):", regErr);
          }
        }
      } catch (e) {
        console.error("Error fetching client by Telegram ID", e);
      }
    } else {
      console.log("No Telegram ID provided - user may not be registered/verified");
    }

    // Determine status: preliminary if 2+ days ahead and no work slot
    const appointmentStatus = (diffDays >= 2 && workDays.length === 0) ? "preliminary" : "confirmed";

    // Создаем запись
    const newAppointment = await db
      .insert(appointments)
      .values({
        masterId: masterIdNum,
        serviceId,
        variantId: variantId || null,
        appointmentDate,
        startTime,
        endTime,
        clientName: finalClientName,
        clientPhone: finalClientPhone,
        clientTelegramId: finalTelegramId || null,
        status: appointmentStatus,
        createdAt: new Date().toISOString(),
      })
      .returning();

    // Notify master about preliminary booking
    if (appointmentStatus === "preliminary") {
      try {
        const masterInfo = await db.select({ telegramId: masters.telegramId, fullName: masters.fullName })
          .from(masters).where(eq(masters.id, masterIdNum));
        if (masterInfo[0]?.telegramId) {
          const svcInfo = await db.select({ name: services.name }).from(services).where(eq(services.id, serviceId));
          const MASTERS_BOT_TOKEN = process.env.MASTERS_BOT_TOKEN || "";
          await fetch(`https://api.telegram.org/bot${MASTERS_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: masterInfo[0].telegramId,
              text: `📋 Новая запись (предварительно)\n\n💇 ${svcInfo[0]?.name || "Услуга"} — ${finalClientName}\n⏰ ${startTime}–${endTime}\n📅 ${appointmentDate}\n📝 Запись предварительная — рабочий день ещё не создан`,
            }),
          }).catch(() => {});
        }
      } catch {}
    }

    // Отправляем уведомление клиенту в Telegram, если есть Telegram ID
    if (finalTelegramId) {
      try {
        const notificationResult = await sendTelegramNotification({
          appointmentId: newAppointment[0].id,
          telegramId: finalTelegramId,
          serviceName: service[0].name,
          masterName: masterInfo[0]?.fullName || "Мастер",
          appointmentDate,
          startTime,
          endTime,
        });
        
        if (notificationResult) {
          console.log(`✅ Notification sent to Telegram ID: ${finalTelegramId}`);
        } else {
          console.log(`⚠️ Notification skipped (TELEGRAM_BOT_TOKEN not set) for Telegram ID: ${finalTelegramId}`);
        }
      } catch (notificationError: any) {
        // Не прерываем создание записи, если уведомление не отправилось
        console.error("Error sending Telegram notification:", notificationError);
        console.error("Notification error details:", {
          message: notificationError?.message,
          code: notificationError?.code,
        });
      }
    } else {
      console.log("No Telegram ID found, skipping notification");
    }

    // 1. Detect breaks and early finish FIRST — only for THIS new appointment's neighbors
    try {
      const MASTERS_BOT_TOKEN = process.env.MASTERS_BOT_TOKEN || "";
      const masterTelegramId = masterInfo[0]?.telegramId;
      if (MASTERS_BOT_TOKEN && masterTelegramId) {
        const dayAppts = await db
          .select({ startTime: appointments.startTime, endTime: appointments.endTime })
          .from(appointments)
          .where(
            and(
              eq(appointments.masterId, masterIdNum),
              eq(appointments.appointmentDate, appointmentDate),
              eq(appointments.status, "confirmed")
            )
          );

        const sorted = [...dayAppts].sort((a, b) => a.startTime.localeCompare(b.startTime));
        const newIdx = sorted.findIndex(a => a.startTime === startTime && a.endTime === endTime);
        const dateObj = new Date(appointmentDate + "T00:00:00");
        const formattedDate = dateObj.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });

        // Gap BEFORE this appointment (immediate predecessor only)
        if (newIdx > 0) {
          const prev = sorted[newIdx - 1];
          const gap = timeToMinutes(startTime) - timeToMinutes(prev.endTime);
          if (gap > 0 && gap < 30) {
            await fetch(`https://api.telegram.org/bot${MASTERS_BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: masterTelegramId,
                text: `☕ Перерыв ${gap} мин\n\n📅 ${formattedDate}\n🕐 ${prev.endTime}–${startTime}`,
              }),
            });
          }
        }

        // Gap AFTER this appointment (immediate successor only)
        if (newIdx >= 0 && newIdx < sorted.length - 1) {
          const next = sorted[newIdx + 1];
          const gap = timeToMinutes(next.startTime) - timeToMinutes(endTime);
          if (gap > 0 && gap < 30) {
            await fetch(`https://api.telegram.org/bot${MASTERS_BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: masterTelegramId,
                text: `☕ Перерыв ${gap} мин\n\n📅 ${formattedDate}\n🕐 ${endTime}–${next.startTime}`,
              }),
            });
          }
        }

        // Early finish: if this is the last appointment of the day
        if (newIdx === sorted.length - 1) {
          const shiftSlots = await db
            .select({ shiftEnd: workSlots.endTime })
            .from(workSlots)
            .where(
              and(
                eq(workSlots.masterId, masterIdNum),
                eq(workSlots.workDate, appointmentDate),
                eq(workSlots.isConfirmed, true)
              )
            );
          if (shiftSlots.length > 0) {
            const freeGap = timeToMinutes(shiftSlots[0].shiftEnd) - timeToMinutes(endTime);
            // Only notify if no service fits in remaining time
            const allSvcs = await db.select({ duration: services.duration }).from(services);
            const minDuration = allSvcs.length > 0 ? Math.min(...allSvcs.map((s: any) => s.duration)) : 30;
            if (freeGap > 0 && freeGap < minDuration) {
              await fetch(`https://api.telegram.org/bot${MASTERS_BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: masterTelegramId,
                  text: `🏁 Вы свободны с ${endTime}\n\n📅 ${formattedDate}\n🕐 Последняя запись заканчивается в ${endTime}\n📋 Конец смены: ${shiftSlots[0].shiftEnd}`,
                }),
              });
            }
          }
        }
      }
    } catch (breakError) {
      console.error("Break notification error:", breakError);
    }

    // 2. Then notify master about the new appointment
    if (masterInfo[0]?.telegramId) {
      try {
        await sendMasterNotification({
          masterTelegramId: masterInfo[0].telegramId,
          masterName: masterInfo[0].fullName || "Мастер",
          serviceName: service[0].name,
          appointmentDate,
          startTime,
          endTime,
          clientName: finalClientName,
          clientPhone: finalClientPhone,
        });
      } catch (e) {
        console.error("Failed to send master appointment notification", e);
      }
    }

    // Invalidate optimizations for this master+date so auto-optimize recalculates
    try {
      const existingOpts = await db.select().from(scheduleOptimizations)
        .where(and(eq(scheduleOptimizations.masterId, masterIdNum), eq(scheduleOptimizations.workDate, appointmentDate)));
      for (const opt of existingOpts) {
        await db.delete(optimizationMoves).where(eq(optimizationMoves.optimizationId, opt.id));
        await db.delete(scheduleOptimizations).where(eq(scheduleOptimizations.id, opt.id));
      }
    } catch {}

    return NextResponse.json(newAppointment[0], { status: 201 });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}

// Уведомление мастеру о новой записи
async function sendMasterNotification({
  masterTelegramId,
  masterName,
  serviceName,
  appointmentDate,
  startTime,
  endTime,
  clientName,
  clientPhone,
}: {
  masterTelegramId: string;
  masterName: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientPhone: string | null;
}): Promise<void> {
  const botToken = process.env.MASTERS_BOT_TOKEN;
  if (!botToken) {
    console.log("MASTERS_BOT_TOKEN not set — master notification skipped");
    return;
  }

  const dateObj = new Date(appointmentDate + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const message = `📋 Новая запись!

💆 Услуга: ${serviceName}
📅 Дата: ${formattedDate}
🕒 Время: ${startTime}–${endTime}
👤 Клиент: ${clientName}${clientPhone ? `\n📞 Телефон: ${clientPhone}` : ""}

Ждём вас на смене, ${masterName}!`;

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: masterTelegramId, text: message }),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(`Telegram API error: ${data?.description || response.status}`);
  }
}

// Функция отправки уведомления в Telegram
// Возвращает true если уведомление отправлено, false если пропущено (нет токена), выбрасывает ошибку при ошибке API
async function sendTelegramNotification({
  appointmentId,
  telegramId,
  serviceName,
  masterName,
  appointmentDate,
  startTime,
  endTime,
}: {
  appointmentId: number;
  telegramId: string;
  serviceName: string;
  masterName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
}): Promise<boolean> {
  // Используем токен из переменных окружения или fallback (как в других местах)
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set - notification skipped");
    return false;
  }

  // Форматируем дату для красивого отображения
  const dateObj = new Date(appointmentDate + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Вычисляем, можно ли ещё редактировать запись (не менее чем за 2 часа до начала)
  const appointmentDateTime = new Date(appointmentDate + "T" + startTime + ":00");
  const now = new Date();
  const diffMs = appointmentDateTime.getTime() - now.getTime();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const canEdit = diffMs >= twoHoursMs;

  const message = `✅ Ваша запись оформлена!

💆 Услуга: ${serviceName}
👨‍💼 Мастер: ${masterName}
📅 Дата: ${formattedDate}
🕒 Время: ${startTime}–${endTime}

${canEdit ? "✏️ Вы можете изменить время и мастера не позднее чем за 2 часа до записи." : ""}

Ждём вас в салоне Profit Club!`;

  try {
    // Используем только callback_data, чтобы кнопки работали и в локальной разработке, и в проде
    const inlineKeyboard = [
      [
        {
          text: "❌ Отменить запись",
          callback_data: `ap_cancel:${appointmentId}`,
        },
        {
          text: "✏️ Изменить запись",
          callback_data: `ap_edit:${appointmentId}`,
        },
      ],
      [
        {
          text: "⬅️ В главное меню",
          callback_data: "back_to_main_menu",
        },
      ],
    ];

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Telegram API error:", data);
      throw new Error(`Telegram API error: ${data.description || "Unknown error"}`);
    }

    console.log("Telegram notification sent successfully");
    return true;
  } catch (error: any) {
    console.error("Error sending Telegram notification:", error);
    throw error;
  }
}


