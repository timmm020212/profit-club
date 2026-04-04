import { NextResponse } from "next/server";
import { Telegraf, Markup } from "telegraf";
import { db } from "@/db";
import { masters, workSlots, appointments, workSlotChangeRequests } from "@/db/schema";
import { eq, and, gte, asc } from "drizzle-orm";

// Time helpers
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
}
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });
}

// In-memory state (resets per cold start — acceptable for serverless)
const userStates = new Map<string, any>();

async function isMaster(telegramId: string) {
  const rows = await db.select().from(masters).where(eq(masters.telegramId, telegramId)).limit(1);
  return rows.length > 0 ? rows[0] : null;
}

function createMastersBot() {
  const token = process.env.MASTERS_BOT_TOKEN;
  if (!token) throw new Error("MASTERS_BOT_TOKEN not set");

  const bot = new Telegraf(token);

  // ── Show master menu
  async function showMasterMenu(ctx: any, text?: string) {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;
    const master = await isMaster(telegramId);
    if (!master) {
      await ctx.reply("У вас нет доступа к этому боту.");
      return;
    }

    const menuText = text || `Добро пожаловать, ${master.fullName}!\n\nИспользуйте кнопки ниже для управления расписанием:`;

    await ctx.reply(menuText, Markup.inlineKeyboard([
      [Markup.button.callback("\u{1F4C5} Расписание", "master_schedule")],
      [Markup.button.callback("\u{1F504} Изменить рабочий день", "master_change_day")],
      [Markup.button.callback("\u2699\uFE0F Настройки", "master_settings")],
    ]));
  }

  // ── /start
  bot.start(async (ctx) => {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;
    const master = await isMaster(telegramId);
    if (!master) {
      await ctx.reply("У вас нет доступа к этому боту. Вы не зарегистрированы как мастер.");
      return;
    }
    await showMasterMenu(ctx);
  });

  // ── Schedule
  bot.action("master_schedule", async (ctx) => {
    try { await ctx.answerCbQuery(); } catch {}
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;
    const master = await isMaster(telegramId);
    if (!master) return;

    const today = todayStr();
    const slots = await db.select().from(workSlots)
      .where(and(eq(workSlots.masterId, master.id), gte(workSlots.workDate, today), eq(workSlots.isConfirmed, true)))
      .orderBy(asc(workSlots.workDate), asc(workSlots.startTime));

    if (slots.length === 0) {
      await ctx.reply("У вас нет рабочих дней", Markup.inlineKeyboard([[Markup.button.callback("\u2190 Назад", "master_back")]]));
      return;
    }

    let text = "\u{1F4C5} Расписание:\n\n";
    for (const slot of slots) {
      const dayAppts = await db.select({ startTime: appointments.startTime, endTime: appointments.endTime, id: appointments.id })
        .from(appointments)
        .where(and(eq(appointments.masterId, master.id), eq(appointments.appointmentDate, slot.workDate), eq(appointments.status, "confirmed")));

      text += `\u{1F4C5} ${formatDateDisplay(slot.workDate)} ${slot.startTime}\u2013${slot.endTime}`;
      if (dayAppts.length > 0) text += ` (${dayAppts.length} зап.)`;
      text += "\n";
    }

    await ctx.reply(text, Markup.inlineKeyboard([[Markup.button.callback("\u2190 Назад", "master_back")]]));
  });

  // ── Change day
  bot.action("master_change_day", async (ctx) => {
    try { await ctx.answerCbQuery(); } catch {}
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;
    const master = await isMaster(telegramId);
    if (!master) return;

    const today = todayStr();
    const workSlotsList = await db.select().from(workSlots)
      .where(and(eq(workSlots.masterId, master.id), gte(workSlots.workDate, today), eq(workSlots.isConfirmed, true)))
      .orderBy(asc(workSlots.workDate), asc(workSlots.startTime));

    if (workSlotsList.length === 0) {
      await ctx.reply("У вас нет запланированных рабочих дней для изменения");
      return;
    }

    const buttons = workSlotsList.map(slot => [
      Markup.button.callback(`${formatDateDisplay(slot.workDate)} ${slot.startTime}\u2013${slot.endTime}`, `chday_select_${slot.id}`),
    ]);
    buttons.push([Markup.button.callback("\u2190 Назад", "master_back")]);
    await ctx.reply("\u{1F4C5} Выберите рабочий день:", Markup.inlineKeyboard(buttons));
  });

  // ── chday_select
  bot.action(/^chday_select_(\d+)$/, async (ctx) => {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;
    const master = await isMaster(telegramId);
    if (!master) return;

    const slotId = parseInt(ctx.match[1]);
    const slotRows = await db.select().from(workSlots).where(eq(workSlots.id, slotId)).limit(1);
    if (!slotRows.length) return;

    const slot = slotRows[0];
    userStates.set(telegramId, { selectedSlotId: slot.id, selectedSlot: slot });

    try {
      await ctx.editMessageText(
        `\u{1F4C5} ${formatDateDisplay(slot.workDate)}\n\u23F0 ${slot.startTime}\u2013${slot.endTime}\n\nЧто вы хотите сделать?`,
        Markup.inlineKeyboard([
          [Markup.button.callback("\u{1F550} Изменить время", `chday_time_${slot.id}`)],
          [Markup.button.callback("\u274C Отменить рабочий день", `chday_cancel_${slot.id}`)],
          [Markup.button.callback("\u2190 Назад", "master_back")],
        ]),
      );
    } catch {}
    try { await ctx.answerCbQuery(); } catch {}
  });

  // ── Cancel day
  bot.action(/^chday_cancel_(\d+)$/, async (ctx) => {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;
    const master = await isMaster(telegramId);
    if (!master) return;

    const slotId = parseInt(ctx.match[1]);
    const slotRows = await db.select().from(workSlots).where(eq(workSlots.id, slotId)).limit(1);
    if (!slotRows.length) return;
    const slot = slotRows[0];

    const dayAppts = await db.select({ id: appointments.id, startTime: appointments.startTime, endTime: appointments.endTime })
      .from(appointments)
      .where(and(eq(appointments.masterId, master.id), eq(appointments.appointmentDate, slot.workDate), eq(appointments.status, "confirmed")));

    if (dayAppts.length > 0) {
      const list = dayAppts.map(a => `  ${a.startTime}\u2013${a.endTime}`).join("\n");
      try {
        await ctx.editMessageText(`\u274C Невозможно отменить!\n\nНа ${formatDateDisplay(slot.workDate)} есть записи:\n${list}`,
          Markup.inlineKeyboard([[Markup.button.callback("\u2190 Назад", "master_back")]]));
      } catch {}
    } else {
      await db.insert(workSlotChangeRequests).values({
        workSlotId: slot.id, masterId: master.id,
        suggestedWorkDate: slot.workDate, suggestedStartTime: slot.startTime, suggestedEndTime: slot.endTime,
        status: "pending", type: "cancel", createdAt: new Date().toISOString(),
      });
      try { await ctx.editMessageText(`\u2705 Запрос на отмену ${formatDateDisplay(slot.workDate)} отправлен администратору`); } catch {}
    }
    try { await ctx.answerCbQuery(); } catch {}
  });

  // ── Time change flow
  bot.action(/^chday_time_(\d+)$/, async (ctx) => {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;
    const master = await isMaster(telegramId);
    if (!master) return;

    const slotId = parseInt(ctx.match[1]);
    const slotRows = await db.select().from(workSlots).where(eq(workSlots.id, slotId)).limit(1);
    if (!slotRows.length) return;
    const slot = slotRows[0];

    const dayAppts = await db.select({ id: appointments.id, startTime: appointments.startTime, endTime: appointments.endTime })
      .from(appointments)
      .where(and(eq(appointments.masterId, master.id), eq(appointments.appointmentDate, slot.workDate), eq(appointments.status, "confirmed")));

    userStates.set(telegramId, { waitingForStartTimePick: true, selectedSlotId: slot.id, selectedSlot: slot, dayAppts });

    const startOptions: string[] = [];
    for (let m = 7 * 60; m <= 14 * 60; m += 60) startOptions.push(minutesToTime(m));

    const rows: any[][] = [];
    for (let i = 0; i < startOptions.length; i += 2) {
      const row = [Markup.button.callback(startOptions[i] === slot.startTime ? `\u2705 ${startOptions[i]}` : startOptions[i], `pick_start_${startOptions[i]}`)];
      if (i + 1 < startOptions.length) row.push(Markup.button.callback(startOptions[i+1] === slot.startTime ? `\u2705 ${startOptions[i+1]}` : startOptions[i+1], `pick_start_${startOptions[i+1]}`));
      rows.push(row);
    }
    rows.push([Markup.button.callback("\u2190 Назад", "master_back")]);

    try {
      await ctx.editMessageText(`\u{1F550} Новое время начала смены\n\u{1F4C5} ${formatDateDisplay(slot.workDate)}\nСейчас: ${slot.startTime}\u2013${slot.endTime}`, Markup.inlineKeyboard(rows));
    } catch {}
    try { await ctx.answerCbQuery(); } catch {}
  });

  bot.action(/^pick_start_(\d{2}:\d{2})$/, async (ctx) => {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;
    const state = userStates.get(telegramId);
    if (!state?.waitingForStartTimePick) return;

    const newStart = ctx.match[1];
    const slot = state.selectedSlot;
    const startMin = timeToMinutes(newStart);
    const endOptions: string[] = [];
    for (let m = startMin + 4 * 60; m <= startMin + 12 * 60 && m <= 23 * 60; m += 60) endOptions.push(minutesToTime(m));

    userStates.set(telegramId, { waitingForEndTimePick: true, selectedSlotId: state.selectedSlotId, selectedSlot: slot, newStartTime: newStart, dayAppts: state.dayAppts });

    const rows: any[][] = [];
    for (let i = 0; i < endOptions.length; i += 2) {
      const row = [Markup.button.callback(endOptions[i] === slot.endTime ? `\u2705 ${endOptions[i]}` : endOptions[i], `pick_end_${endOptions[i]}`)];
      if (i + 1 < endOptions.length) row.push(Markup.button.callback(endOptions[i+1] === slot.endTime ? `\u2705 ${endOptions[i+1]}` : endOptions[i+1], `pick_end_${endOptions[i+1]}`));
      rows.push(row);
    }
    rows.push([Markup.button.callback("\u2190 Назад", "master_back")]);

    try { await ctx.editMessageText(`\u{1F550} Выберите время окончания\n\u{1F4C5} ${formatDateDisplay(slot.workDate)}\nНачало: ${newStart}`, Markup.inlineKeyboard(rows)); } catch {}
    try { await ctx.answerCbQuery(); } catch {}
  });

  bot.action(/^pick_end_(\d{2}:\d{2})$/, async (ctx) => {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;
    const state = userStates.get(telegramId);
    if (!state?.waitingForEndTimePick) return;

    const newEnd = ctx.match[1];
    const newStart = state.newStartTime;
    const slot = state.selectedSlot;
    const dayAppts = state.dayAppts || [];
    const master = await isMaster(telegramId);
    if (!master) return;

    const newStartMin = timeToMinutes(newStart);
    const newEndMin = timeToMinutes(newEnd);
    const conflicting = dayAppts.filter((a: any) => timeToMinutes(a.startTime) < newStartMin || timeToMinutes(a.endTime) > newEndMin);

    if (conflicting.length > 0) {
      const list = conflicting.map((a: any) => `  ${a.startTime}\u2013${a.endTime}`).join("\n");
      try { await ctx.editMessageText(`\u274C Невозможно изменить!\n\nЗаписи выходят за рамки ${newStart}\u2013${newEnd}:\n${list}`, Markup.inlineKeyboard([[Markup.button.callback("\u2190 Назад", "master_back")]])); } catch {}
      userStates.delete(telegramId);
      try { await ctx.answerCbQuery(); } catch {}
      return;
    }

    await db.insert(workSlotChangeRequests).values({
      workSlotId: slot.id, masterId: master.id,
      suggestedWorkDate: slot.workDate, suggestedStartTime: newStart, suggestedEndTime: newEnd,
      status: "pending", type: "time_change", createdAt: new Date().toISOString(),
    });

    try { await ctx.editMessageText(`\u2705 Запрос отправлен\n\n\u{1F4C5} ${formatDateDisplay(slot.workDate)}\n\u{1F550} ${slot.startTime}\u2013${slot.endTime} \u2192 ${newStart}\u2013${newEnd}`); } catch {}
    userStates.delete(telegramId);
    try { await ctx.answerCbQuery(); } catch {}
  });

  // ── Settings
  const SETTINGS_LABELS: Record<string, string> = { newAppointments: "Новые записи", cancellations: "Отмены записей", breaks: "Перерывы", morningReminder: "Утреннее напоминание" };
  const SETTINGS_DEFAULTS: Record<string, boolean> = { newAppointments: true, cancellations: true, breaks: true, morningReminder: false };

  function parseSettings(raw: string | null): Record<string, boolean> {
    try { return raw ? { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) } : { ...SETTINGS_DEFAULTS }; } catch { return { ...SETTINGS_DEFAULTS }; }
  }

  bot.action("master_settings", async (ctx) => {
    try { await ctx.answerCbQuery(); } catch {}
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;
    const master = await isMaster(telegramId);
    if (!master) return;
    const settings = parseSettings(master.notificationSettings || null);
    let msg = "\u2699\uFE0F Настройки уведомлений\n\n";
    const buttons: any[] = [];
    for (const [key, label] of Object.entries(SETTINGS_LABELS)) {
      const on = settings[key] ?? SETTINGS_DEFAULTS[key];
      msg += `${on ? "\u2705" : "\u274C"} ${label}\n`;
      buttons.push([Markup.button.callback(`${on ? "\u2705" : "\u274C"} ${label}`, `toggle_notif_${key}`)]);
    }
    buttons.push([Markup.button.callback("\u2190 Назад", "master_back")]);
    ctx.reply(msg, Markup.inlineKeyboard(buttons));
  });

  bot.action(/^toggle_notif_(.+)$/, async (ctx) => {
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;
    const master = await isMaster(telegramId);
    if (!master) return;
    const key = ctx.match[1];
    if (!SETTINGS_LABELS[key]) return;
    const current = parseSettings(master.notificationSettings || null);
    current[key] = !current[key];
    await db.update(masters).set({ notificationSettings: JSON.stringify(current) }).where(eq(masters.id, master.id));
    let msg = "\u2699\uFE0F Настройки уведомлений\n\n";
    const buttons: any[] = [];
    for (const [k, label] of Object.entries(SETTINGS_LABELS)) {
      const on = current[k] ?? SETTINGS_DEFAULTS[k];
      msg += `${on ? "\u2705" : "\u274C"} ${label}\n`;
      buttons.push([Markup.button.callback(`${on ? "\u2705" : "\u274C"} ${label}`, `toggle_notif_${k}`)]);
    }
    buttons.push([Markup.button.callback("\u2190 Назад", "master_back")]);
    try { await ctx.editMessageText(msg, Markup.inlineKeyboard(buttons)); } catch {}
    try { await ctx.answerCbQuery(); } catch {}
  });

  // ── Confirm/reject work slots
  bot.on("callback_query", async (ctx) => {
    const callbackData = (ctx.callbackQuery as any)?.data;
    const telegramId = ctx.from?.id.toString();
    if (!callbackData || !telegramId) return;

    try {
      if (callbackData.startsWith("confirm_request_") || callbackData.startsWith("reject_request_")) {
        const changeRequestId = parseInt(callbackData.split("_").pop()!);
        if (isNaN(changeRequestId)) return;
        const reqs = await db.select().from(workSlotChangeRequests).where(eq(workSlotChangeRequests.id, changeRequestId)).limit(1);
        if (!reqs.length) return;
        const req = reqs[0];
        const isConfirm = callbackData.startsWith("confirm_request_");
        if (isConfirm) {
          await db.update(workSlots).set({ workDate: req.suggestedWorkDate!, startTime: req.suggestedStartTime!, endTime: req.suggestedEndTime!, isConfirmed: true, adminUpdateStatus: "accepted" }).where(eq(workSlots.id, req.workSlotId));
          await db.update(workSlotChangeRequests).set({ status: "accepted" }).where(eq(workSlotChangeRequests.id, changeRequestId));
          try { await ctx.editMessageText(`\u2705 Изменение подтверждено!\n\n\u{1F4C5} ${req.suggestedWorkDate}\n\u23F0 ${req.suggestedStartTime} \u2014 ${req.suggestedEndTime}`); } catch {}
        } else {
          await db.update(workSlotChangeRequests).set({ status: "rejected" }).where(eq(workSlotChangeRequests.id, changeRequestId));
          try { await ctx.editMessageText("\u274C Изменение отклонено."); } catch {}
        }
        try { await ctx.answerCbQuery(); } catch {}
        return;
      }

      if (callbackData.startsWith("confirm_") || callbackData.startsWith("reject_")) {
        const parts = callbackData.split("_");
        const workSlotId = parseInt(parts[parts.length - 1]);
        if (!isNaN(workSlotId)) {
          const isConfirmed = callbackData.startsWith("confirm_");
          await db.update(workSlots).set({ isConfirmed, adminUpdateStatus: isConfirmed ? "accepted" : "rejected" }).where(eq(workSlots.id, workSlotId));
          if (!isConfirmed) {
            const slotData = await db.select().from(workSlots).where(eq(workSlots.id, workSlotId)).limit(1);
            if (slotData.length > 0) {
              const master = await isMaster(telegramId);
              if (master) {
                await db.insert(workSlotChangeRequests).values({ workSlotId, masterId: master.id, type: "master_rejection", suggestedWorkDate: slotData[0].workDate, suggestedStartTime: slotData[0].startTime, suggestedEndTime: slotData[0].endTime, status: "pending", createdAt: new Date().toISOString() });
              }
            }
          }
          try { await ctx.editMessageText(`Рабочий день ${isConfirmed ? "\u2705 подтвержден" : "\u274C отклонен"}!`); } catch {}
          try { await ctx.answerCbQuery(); } catch {}
        }
      }
    } catch (error) {
      console.error("Error handling callback:", error);
    }
  });

  // ── Back to menu
  bot.action("master_back", async (ctx) => {
    try { await ctx.answerCbQuery(); } catch {}
    try { await ctx.editMessageText("Главное меню \u2B07\uFE0F"); } catch {}
    await showMasterMenu(ctx);
  });

  return bot;
}

let mastersBot: Telegraf | null = null;
function getMastersBot() {
  if (!mastersBot) mastersBot = createMastersBot();
  return mastersBot;
}

export async function POST(request: Request) {
  try {
    // Verify Telegram webhook secret token
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
      if (headerSecret !== webhookSecret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const bot = getMastersBot();
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[masters-webhook] Error:", error);
    return NextResponse.json({ ok: true });
  }
}
