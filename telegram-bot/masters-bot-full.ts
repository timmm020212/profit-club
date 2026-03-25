import { config } from 'dotenv';
config({ path: '.env.local' });

import { Telegraf, Markup } from 'telegraf';
import { db } from '../db/index-postgres';
import { masters, workSlots, appointments, services, workSlotChangeRequests, botFlows, botSteps } from '../db/schema-postgres';
import { eq, and, gte, asc } from 'drizzle-orm';
import { stepText, stepButtons } from './bot-texts';
import { registerEngine } from './engine';

function getMastersToken(): string {
  return process.env.MASTERS_BOT_TOKEN || '';
}

const bot = new Telegraf(getMastersToken());

// Простое хранилище состояний
const userStates = new Map<string, any>();

// ── Time helpers ──────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });
}

// ── Auth ──────────────────────────────────────────────────────

async function isMaster(telegramId: string): Promise<any> {
  try {
    const master = await db
      .select()
      .from(masters)
      .where(eq(masters.telegramId, telegramId))
      .limit(1);

    return master.length > 0 ? master[0] : null;
  } catch (error) {
    console.error('Error checking master rights:', error);
    return null;
  }
}

// ── Menu ──────────────────────────────────────────────────────

/** Строит клавиатуру главного меню мастера из БД, fallback — хардкод. */
async function buildMasterMenu(): Promise<{ markup: any; isInline: boolean }> {
  // Прямой запрос к БД без кеша — всегда свежие данные.
  // Ищем первый активный masters-флоу, в нём шаг с slug='master_menu' или первый шаг.
  let isReply = false;
  try {
    const [flow] = await db.select({ id: botFlows.id })
      .from(botFlows)
      .where(and(eq(botFlows.botType, 'masters'), eq(botFlows.isActive, true)))
      .orderBy(asc(botFlows.order))
      .limit(1);

    if (flow) {
      const steps = await db.select({ useReplyKeyboard: botSteps.useReplyKeyboard, slug: botSteps.slug })
        .from(botSteps)
        .where(eq(botSteps.flowId, flow.id))
        .orderBy(asc(botSteps.order));

      const menuStep = steps.find(s => s.slug === 'master_menu') ?? steps[0];
      isReply = menuStep?.useReplyKeyboard ?? false;
      console.log(`[masters-menu] flow=${flow.id} steps=${steps.length} menuStep.slug=${menuStep?.slug} useReplyKeyboard=${isReply}`);
    } else {
      console.log(`[masters-menu] no active masters flow found in DB`);
    }
  } catch (e) {
    console.error(`[masters-menu] DB error:`, e);
    isReply = false;
  }

  const rows = await stepButtons('master_menu');
  if (rows.length > 0) {
    if (!isReply) {
      return {
        markup: Markup.inlineKeyboard(
          rows.map(row => row.map(b => Markup.button.callback(b.label, b.callbackData || b.label)))
        ),
        isInline: true,
      };
    }
    return { markup: Markup.keyboard(rows.map(row => row.map(b => b.label))).resize(), isInline: false };
  }
  // fallback — respect isReply flag
  if (!isReply) {
    return {
      markup: Markup.inlineKeyboard([
        [Markup.button.callback('📅 Расписание', 'master_schedule')],
        [Markup.button.callback('🔄 Изменить рабочий день', 'master_change_day')],
        [Markup.button.callback('⚙️ Настройки', 'master_settings')],
      ]),
      isInline: true,
    };
  }
  return {
    markup: Markup.keyboard([
      ['📅 Расписание'],
      ['🔄 Изменить рабочий день'],
      ['⚙️ Настройки'],
    ]).resize(),
    isInline: false,
  };
}

/** Показывает главное меню. Если inline — сначала убирает reply-клавиатуру, затем отправляет меню. */
async function showMasterMenu(ctx: any, text: string) {
  const { markup, isInline } = await buildMasterMenu();
  if (isInline) {
    // Убираем reply-клавиатуру: отправляем скрытое сообщение и сразу удаляем его
    try {
      const rm = await ctx.reply('·', Markup.removeKeyboard());
      await ctx.telegram.deleteMessage(ctx.chat.id, rm.message_id);
    } catch {}
  }
  await ctx.reply(text, markup);
}

// ── Schedule view ─────────────────────────────────────────────

async function showSchedule(
  ctx: any,
  masterId: number,
  targetDate?: string,
  useReply: boolean = true,
) {
  try {
    const today = todayStr();

    if (!targetDate) {
      const nearest = await db
        .select()
        .from(workSlots)
        .where(
          and(
            eq(workSlots.masterId, masterId),
            gte(workSlots.workDate, today),
            eq(workSlots.isConfirmed, true),
          ),
        )
        .orderBy(asc(workSlots.workDate))
        .limit(1);

      if (!nearest.length) {
        const msg = await stepText('master_no_workdays', {}, 'У вас нет рабочих дней');
        if (useReply) return ctx.reply(msg);
        return ctx.editMessageText(msg);
      }
      targetDate = nearest[0].workDate;
    }

    const slotRows = await db
      .select()
      .from(workSlots)
      .where(
        and(
          eq(workSlots.masterId, masterId),
          eq(workSlots.workDate, targetDate),
          eq(workSlots.isConfirmed, true),
        ),
      )
      .limit(1);

    let msg = await stepText('master_schedule_header', { workDate: formatDateDisplay(targetDate) }, `📅 Расписание — ${formatDateDisplay(targetDate)}\n`);

    if (!slotRows.length) {
      msg += '\n😴 Выходной';
    } else {
      const slot = slotRows[0];
      const shiftStart = timeToMinutes(slot.startTime);
      const shiftEnd = timeToMinutes(slot.endTime);
      msg += `🕐 ${slot.startTime}–${slot.endTime} (смена)\n`;

      const appts = await db
        .select({
          id: appointments.id,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          clientName: appointments.clientName,
          serviceName: services.name,
          serviceDuration: services.duration,
        })
        .from(appointments)
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .where(
          and(
            eq(appointments.masterId, masterId),
            eq(appointments.appointmentDate, targetDate),
            eq(appointments.status, 'confirmed'),
          ),
        )
        .orderBy(asc(appointments.startTime));

      if (!appts.length) {
        msg += '\nНет записей, весь день свободен';
      } else {
        msg += '\n';

        const allServices = await db.select({ duration: services.duration }).from(services);
        const shortestDuration = allServices.length > 0
          ? Math.min(...allServices.map(s => s.duration))
          : 30;

        let cursor = shiftStart;

        for (let i = 0; i < appts.length; i++) {
          const apt = appts[i];
          const aptStart = timeToMinutes(apt.startTime);
          const aptEnd = timeToMinutes(apt.endTime);

          if (aptStart > cursor) {
            const gap = aptStart - cursor;
            if (gap < 30) {
              msg += `☕ ${minutesToTime(cursor)}–${minutesToTime(aptStart)} перерыв (${gap} мин)\n`;
            } else {
              msg += `🕐 ${minutesToTime(cursor)}–${minutesToTime(aptStart)} свободно\n`;
            }
          }

          const clientShort = apt.clientName || 'Клиент';
          msg += `${apt.startTime}–${apt.endTime} 💇 ${apt.serviceName || 'Услуга'} — ${clientShort}\n`;

          cursor = aptEnd;
        }

        if (cursor < shiftEnd) {
          const gap = shiftEnd - cursor;
          if (gap < shortestDuration) {
            msg += `🏁 Свободны с ${minutesToTime(cursor)}`;
          } else {
            msg += `🕐 ${minutesToTime(cursor)}–${minutesToTime(shiftEnd)} свободно`;
          }
        }
      }
    }

    const d = new Date(targetDate + 'T00:00:00');
    const prevD = new Date(d); prevD.setDate(prevD.getDate() - 1);
    const nextD = new Date(d); nextD.setDate(nextD.getDate() + 1);

    const ds = (date: Date): string =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const prevDateStr = ds(prevD);
    const nextDateStr = ds(nextD);

    const navButtons: any[] = [];
    navButtons.push(Markup.button.callback(`← ${formatDateDisplay(prevDateStr)}`, `sched_prev_${prevDateStr}`));
    navButtons.push(Markup.button.callback(`${formatDateDisplay(nextDateStr)} →`, `sched_next_${nextDateStr}`));

    const inlineKeyboard = navButtons.length > 0
      ? Markup.inlineKeyboard([navButtons])
      : undefined;

    if (useReply) {
      return inlineKeyboard
        ? ctx.reply(msg, inlineKeyboard)
        : ctx.reply(msg);
    } else {
      return inlineKeyboard
        ? ctx.editMessageText(msg, inlineKeyboard)
        : ctx.editMessageText(msg);
    }
  } catch (error) {
    console.error('Error showing schedule:', error);
    const errMsg = 'Произошла ошибка при получении расписания';
    if (useReply) return ctx.reply(errMsg);
    return ctx.editMessageText(errMsg);
  }
}

// ── /start ────────────────────────────────────────────────────

bot.start(async (ctx) => {
  const telegramId = ctx.from?.id.toString();

  if (!telegramId) {
    return ctx.reply('Ошибка: не удалось определить ваш Telegram ID');
  }

  const master = await isMaster(telegramId);

  if (master) {
    const welcomeText = await stepText('master_welcome', { masterName: master.fullName, fullName: master.fullName }, `Добро пожаловать, ${master.fullName}!`);
    await showMasterMenu(ctx, welcomeText);
  } else {
    const noAccessText = await stepText('master_no_access', {}, 'У вас нет доступа к этому боту. Вы не зарегистрированы как мастер.');
    ctx.reply(noAccessText);
  }
});

// ── Расписание ────────────────────────────────────────────────

bot.hears('📅 Расписание', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const master = await isMaster(telegramId);
  if (!master) return;

  await showSchedule(ctx, master.id);
});

bot.action(/^sched_(prev|next)_(.+)$/, async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const master = await isMaster(telegramId);
  if (!master) return;

  const targetDate = ctx.match[2];
  await showSchedule(ctx, master.id, targetDate, false);
  try { await ctx.answerCbQuery(); } catch {}
});

// ── Изменить рабочий день ─────────────────────────────────────

bot.hears('🔄 Изменить рабочий день', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const master = await isMaster(telegramId);
  if (!master) return;

  try {
    const today = todayStr();

    const workSlotsList = await db
      .select()
      .from(workSlots)
      .where(and(
        eq(workSlots.masterId, master.id),
        gte(workSlots.workDate, today),
        eq(workSlots.isConfirmed, true),
      ))
      .orderBy(asc(workSlots.workDate), asc(workSlots.startTime));

    if (workSlotsList.length === 0) {
      const noSlotsText = await stepText('master_no_slots_change', {}, 'У вас нет запланированных рабочих дней для изменения');
      return ctx.reply(noSlotsText);
    }

    const buttons = workSlotsList.map(slot => [
      Markup.button.callback(
        `${formatDateDisplay(slot.workDate)} ${slot.startTime}–${slot.endTime}`,
        `chday_select_${slot.id}`,
      ),
    ]);
    buttons.push([Markup.button.callback('← Назад', 'chday_back')]);

    const changeDayText = await stepText('master_change_day', {}, '📅 Выберите рабочий день:');
    await ctx.reply(changeDayText, Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('Error fetching work slots for change:', error);
    ctx.reply('Произошла ошибка');
  }
});

bot.action(/^chday_select_(\d+)$/, async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  const master = await isMaster(telegramId);
  if (!master) { try { await ctx.answerCbQuery(); } catch {} return; }

  const slotId = parseInt(ctx.match[1]);
  const slotRows = await db.select().from(workSlots).where(eq(workSlots.id, slotId)).limit(1);
  if (!slotRows.length) { try { await ctx.answerCbQuery('Не найдено'); } catch {} return; }

  const slot = slotRows[0];
  userStates.set(telegramId, { selectedSlotId: slot.id, selectedSlot: slot });

  try {
    const slotActionText = await stepText(
      'master_slot_action',
      { workDate: formatDateDisplay(slot.workDate), startTime: slot.startTime, endTime: slot.endTime },
      `📅 ${formatDateDisplay(slot.workDate)}\n⏰ ${slot.startTime}–${slot.endTime}\n\nЧто вы хотите сделать?`
    );
    await ctx.editMessageText(
      slotActionText,
      Markup.inlineKeyboard([
        [Markup.button.callback('🕐 Изменить время', `chday_time_${slot.id}`)],
        [Markup.button.callback('❌ Отменить рабочий день', `chday_cancel_${slot.id}`)],
        [Markup.button.callback('← Назад', 'chday_back')],
      ]),
    );
  } catch {}
  try { await ctx.answerCbQuery(); } catch {}
});

bot.action(/^chday_cancel_(\d+)$/, async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  const master = await isMaster(telegramId);
  if (!master) { try { await ctx.answerCbQuery(); } catch {} return; }

  const slotId = parseInt(ctx.match[1]);
  const slotRows = await db.select().from(workSlots).where(eq(workSlots.id, slotId)).limit(1);
  if (!slotRows.length) { try { await ctx.answerCbQuery(); } catch {} return; }
  const slot = slotRows[0];

  const dayAppts = await db.select({ id: appointments.id, startTime: appointments.startTime, endTime: appointments.endTime })
    .from(appointments)
    .where(and(eq(appointments.masterId, master.id), eq(appointments.appointmentDate, slot.workDate), eq(appointments.status, 'confirmed')));

  if (dayAppts.length > 0) {
    const list = dayAppts.map((a: any) => `  ${a.startTime}–${a.endTime}`).join('\n');
    const cancelBlockedText = await stepText(
      'master_cancel_blocked',
      { workDate: formatDateDisplay(slot.workDate), appointmentList: list },
      `❌ Невозможно отменить!\n\nНа ${formatDateDisplay(slot.workDate)} есть записи:\n${list}\n\nСначала отмените записи.`
    );
    try {
      await ctx.editMessageText(
        cancelBlockedText,
        Markup.inlineKeyboard([[Markup.button.callback('← Главное меню', 'chday_back')]]),
      );
    } catch {}
  } else {
    await handleWorkSlotChange(telegramId, slot, 'cancel');
    const cancelSentText = await stepText(
      'master_cancel_sent',
      { workDate: formatDateDisplay(slot.workDate) },
      `✅ Запрос на отмену ${formatDateDisplay(slot.workDate)} отправлен администратору`
    );
    try { await ctx.editMessageText(cancelSentText); } catch {}
  }
  try { await ctx.answerCbQuery(); } catch {}
});

bot.action(/^chday_time_(\d+)$/, async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  const master = await isMaster(telegramId);
  if (!master) { try { await ctx.answerCbQuery(); } catch {} return; }

  const slotId = parseInt(ctx.match[1]);
  const slotRows = await db.select().from(workSlots).where(eq(workSlots.id, slotId)).limit(1);
  if (!slotRows.length) { try { await ctx.answerCbQuery(); } catch {} return; }
  const slot = slotRows[0];

  const dayAppts = await db.select({ id: appointments.id, startTime: appointments.startTime, endTime: appointments.endTime })
    .from(appointments)
    .where(and(eq(appointments.masterId, master.id), eq(appointments.appointmentDate, slot.workDate), eq(appointments.status, 'confirmed')));

  userStates.set(telegramId, { waitingForStartTimePick: true, selectedSlotId: slot.id, selectedSlot: slot, dayAppts });

  const startOptions: string[] = [];
  for (let m = 7 * 60; m <= 14 * 60; m += 60) startOptions.push(minutesToTime(m));

  const rows: any[][] = [];
  for (let i = 0; i < startOptions.length; i += 2) {
    const row = [Markup.button.callback(startOptions[i] === slot.startTime ? `✅ ${startOptions[i]}` : startOptions[i], `pick_start_${startOptions[i]}`)];
    if (i + 1 < startOptions.length) {
      row.push(Markup.button.callback(startOptions[i+1] === slot.startTime ? `✅ ${startOptions[i+1]}` : startOptions[i+1], `pick_start_${startOptions[i+1]}`));
    }
    rows.push(row);
  }
  rows.push([Markup.button.callback('← Назад', 'chday_back')]);

  try {
    const pickStartText = await stepText(
      'master_pick_start',
      { workDate: formatDateDisplay(slot.workDate), startTime: slot.startTime, endTime: slot.endTime },
      `🕐 Новое время начала смены\n📅 ${formatDateDisplay(slot.workDate)}\nСейчас: ${slot.startTime}–${slot.endTime}`
    );
    await ctx.editMessageText(pickStartText, Markup.inlineKeyboard(rows));
  } catch {}
  try { await ctx.answerCbQuery(); } catch {}
});

bot.action('chday_back', async (ctx) => {
  try { await ctx.editMessageText('Главное меню ⬇️'); } catch {}
  try { await ctx.answerCbQuery(); } catch {}
});

// ── Настройки ─────────────────────────────────────────────────

const SETTINGS_LABELS: Record<string, string> = {
  newAppointments: 'Новые записи',
  cancellations: 'Отмены записей',
  breaks: 'Перерывы',
  morningReminder: 'Утреннее напоминание',
};

const SETTINGS_DEFAULTS: Record<string, boolean> = {
  newAppointments: true,
  cancellations: true,
  breaks: true,
  morningReminder: false,
};

function parseSettings(raw: string | null): Record<string, boolean> {
  try {
    if (!raw) return { ...SETTINGS_DEFAULTS };
    return { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...SETTINGS_DEFAULTS }; }
}

function buildSettingsMessage(settings: Record<string, boolean>) {
  let msg = '⚙️ Настройки уведомлений\n\n';
  const buttons: any[] = [];
  for (const [key, label] of Object.entries(SETTINGS_LABELS)) {
    const on = settings[key] ?? SETTINGS_DEFAULTS[key];
    msg += `${on ? '✅' : '❌'} ${label}\n`;
    buttons.push([Markup.button.callback(`${on ? '✅' : '❌'} ${label}`, `toggle_notif_${key}`)]);
  }
  buttons.push([Markup.button.callback('← Назад', 'settings_back')]);
  return { msg, keyboard: Markup.inlineKeyboard(buttons) };
}

bot.hears('⚙️ Настройки', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const master = await isMaster(telegramId);
  if (!master) return;

  const settings = parseSettings(master.notificationSettings || null);
  const { msg, keyboard } = buildSettingsMessage(settings);
  ctx.reply(msg, keyboard);
});

bot.action(/^toggle_notif_(.+)$/, async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const master = await isMaster(telegramId);
  if (!master) { try { await ctx.answerCbQuery(); } catch {} return; }

  const key = ctx.match[1];
  if (!SETTINGS_LABELS[key]) { try { await ctx.answerCbQuery(); } catch {} return; }

  const current = parseSettings(master.notificationSettings || null);
  current[key] = !current[key];

  await db.update(masters)
    .set({ notificationSettings: JSON.stringify(current) })
    .where(eq(masters.id, master.id));

  const { msg, keyboard } = buildSettingsMessage(current);
  try { await ctx.editMessageText(msg, keyboard); } catch {}
  try { await ctx.answerCbQuery(); } catch {}
});

bot.action('settings_back', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  try { await ctx.editMessageText('Главное меню ⬇️'); } catch {}
});

// ── Возврат в главное меню ────────────────────────────────────

bot.hears('🔙 Главное меню', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (telegramId) {
    userStates.delete(telegramId);
  }
  await showMasterMenu(ctx, 'Главное меню:');
});

// ── Time picker callbacks ─────────────────────────────────────

bot.action(/^pick_start_(\d{2}:\d{2})$/, async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  const state = userStates.get(telegramId);
  if (!state?.waitingForStartTimePick) { try { await ctx.answerCbQuery(); } catch {} return; }

  const newStart = ctx.match[1];
  const slot = state.selectedSlot;

  const startMin = timeToMinutes(newStart);
  const endOptions: string[] = [];
  for (let m = startMin + 4 * 60; m <= startMin + 12 * 60 && m <= 23 * 60; m += 60) {
    endOptions.push(minutesToTime(m));
  }

  userStates.set(telegramId, {
    waitingForEndTimePick: true,
    selectedSlotId: state.selectedSlotId,
    selectedSlot: state.selectedSlot,
    newStartTime: newStart,
    dayAppts: state.dayAppts,
  });

  const buttons = endOptions.map(t => {
    const label = t === slot.endTime ? `✅ ${t}` : t;
    return [Markup.button.callback(label, `pick_end_${t}`)];
  });
  const rows: any[][] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    const row = [buttons[i][0]];
    if (i + 1 < buttons.length) row.push(buttons[i + 1][0]);
    rows.push(row);
  }
  rows.push([Markup.button.callback('← Назад', 'chday_back')]);

  try {
    const pickEndText = await stepText(
      'master_pick_end',
      { workDate: formatDateDisplay(slot.workDate), newStartTime: newStart },
      `🕐 Выберите время окончания смены\n📅 ${formatDateDisplay(slot.workDate)}\nНачало: ${newStart}`
    );
    await ctx.editMessageText(pickEndText, Markup.inlineKeyboard(rows));
  } catch {}
  try { await ctx.answerCbQuery(); } catch {}
});

bot.action(/^pick_end_(\d{2}:\d{2})$/, async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  const state = userStates.get(telegramId);
  if (!state?.waitingForEndTimePick) { try { await ctx.answerCbQuery(); } catch {} return; }

  const newEnd = ctx.match[1];
  const newStart = state.newStartTime;
  const slot = state.selectedSlot;
  const dayAppts = state.dayAppts || [];

  const newStartMin = timeToMinutes(newStart);
  const newEndMin = timeToMinutes(newEnd);
  const conflicting = dayAppts.filter((a: any) => {
    const aStart = timeToMinutes(a.startTime);
    const aEnd = timeToMinutes(a.endTime);
    return aStart < newStartMin || aEnd > newEndMin;
  });

  if (conflicting.length > 0) {
    const list = conflicting.map((a: any) => `  ${a.startTime}–${a.endTime}`).join('\n');
    const changeBlockedText = await stepText(
      'master_time_change_blocked',
      { newStartTime: newStart, newEndTime: newEnd, appointmentList: list },
      `❌ Невозможно изменить время!\n\nЗаписи выходят за рамки ${newStart}–${newEnd}:\n${list}\n\nСначала перенесите или отмените эти записи.`
    );
    try {
      await ctx.editMessageText(
        changeBlockedText,
        Markup.inlineKeyboard([[Markup.button.callback('← Главное меню', 'chday_back')]]),
      );
    } catch {}
    userStates.delete(telegramId);
    try { await ctx.answerCbQuery(); } catch {}
    return;
  }

  await handleWorkSlotChange(telegramId, slot, 'time_change', {
    newStartTime: newStart,
    newEndTime: newEnd,
  });

  try {
    const changeSentText = await stepText(
      'master_time_change_sent',
      { workDate: formatDateDisplay(slot.workDate), startTime: slot.startTime, endTime: slot.endTime, newStartTime: newStart, newEndTime: newEnd },
      `✅ Запрос отправлен администратору\n\n📅 ${formatDateDisplay(slot.workDate)}\n🕐 ${slot.startTime}–${slot.endTime} → ${newStart}–${newEnd}`
    );
    await ctx.editMessageText(changeSentText);
  } catch {}
  userStates.delete(telegramId);
  try { await ctx.answerCbQuery(); } catch {}
});

// ── handleWorkSlotChange ──────────────────────────────────────

async function handleWorkSlotChange(telegramId: string, slot: any, type: string, changes?: any) {
  try {
    const master = await isMaster(telegramId);
    if (!master) return;

    await db.insert(workSlotChangeRequests).values({
      workSlotId: slot.id,
      masterId: master.id,
      suggestedWorkDate: changes?.newDate || slot.workDate,
      suggestedStartTime: changes?.newStartTime || slot.startTime,
      suggestedEndTime: changes?.newEndTime || slot.endTime,
      status: 'pending',
      type: type,
      createdAt: new Date().toISOString(),
    });

    console.log(`Change request created for master ${master.fullName}, slot ${slot.id}`);
  } catch (error) {
    console.error('Error creating change request:', error);
  }
}

// ── Inline menu action handlers (when useReplyKeyboard=false) ─
bot.action('master_schedule', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  const master = await isMaster(telegramId);
  if (!master) return;
  await showSchedule(ctx, master.id, undefined, true);
});

bot.action('master_change_day', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  const master = await isMaster(telegramId);
  if (!master) return;
  try {
    const today = todayStr();
    const workSlotsList = await db
      .select()
      .from(workSlots)
      .where(and(
        eq(workSlots.masterId, master.id),
        gte(workSlots.workDate, today),
        eq(workSlots.isConfirmed, true),
      ))
      .orderBy(asc(workSlots.workDate), asc(workSlots.startTime));
    if (workSlotsList.length === 0) {
      const noSlotsText = await stepText('master_no_slots_change', {}, 'У вас нет запланированных рабочих дней для изменения');
      return ctx.reply(noSlotsText);
    }
    const buttons = workSlotsList.map(slot => [
      Markup.button.callback(
        `${formatDateDisplay(slot.workDate)} ${slot.startTime}–${slot.endTime}`,
        `chday_select_${slot.id}`,
      ),
    ]);
    buttons.push([Markup.button.callback('← Назад', 'chday_back')]);
    const changeDayText = await stepText('master_change_day', {}, '📅 Выберите рабочий день:');
    await ctx.reply(changeDayText, Markup.inlineKeyboard(buttons));
  } catch (error) {
    console.error('Error fetching work slots for change:', error);
    ctx.reply('Произошла ошибка');
  }
});

bot.action('master_settings', async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;
  const master = await isMaster(telegramId);
  if (!master) return;
  const settings = parseSettings(master.notificationSettings || null);
  const { msg, keyboard } = buildSettingsMessage(settings);
  ctx.reply(msg, keyboard);
});

// ── Callback queries ──────────────────────────────────────────

bot.on('callback_query', async (ctx) => {
  const callbackData = (ctx.callbackQuery as any)?.data;
  const telegramId = ctx.from?.id.toString();

  if (!callbackData || !telegramId) return;

  try {
    if (callbackData.startsWith('confirm_request_') || callbackData.startsWith('reject_request_')) {
      const changeRequestId = parseInt(callbackData.split('_').pop()!);
      if (isNaN(changeRequestId)) { try { await ctx.answerCbQuery('Некорректный запрос'); } catch {} return; }

      const reqs = await db.select().from(workSlotChangeRequests).where(eq(workSlotChangeRequests.id, changeRequestId)).limit(1);
      if (!reqs.length) { try { await ctx.answerCbQuery('Запрос не найден'); } catch {} return; }

      const req = reqs[0];
      const isConfirm = callbackData.startsWith('confirm_request_');

      if (isConfirm) {
        await db.update(workSlots).set({
          workDate: req.suggestedWorkDate,
          startTime: req.suggestedStartTime,
          endTime: req.suggestedEndTime,
          isConfirmed: true,
          adminUpdateStatus: 'accepted',
        }).where(eq(workSlots.id, req.workSlotId));
        await db.update(workSlotChangeRequests).set({ status: 'accepted' }).where(eq(workSlotChangeRequests.id, changeRequestId));
        const acceptedText = await stepText(
          'master_change_accepted',
          { workDate: req.suggestedWorkDate, startTime: req.suggestedStartTime, endTime: req.suggestedEndTime },
          `✅ Изменение подтверждено!\n\n📅 ${req.suggestedWorkDate}\n⏰ ${req.suggestedStartTime} — ${req.suggestedEndTime}`
        );
        try { await ctx.editMessageText(acceptedText); } catch {}
      } else {
        await db.update(workSlotChangeRequests).set({ status: 'rejected' }).where(eq(workSlotChangeRequests.id, changeRequestId));
        const rejectedText = await stepText('master_change_rejected', {}, '❌ Изменение отклонено.');
        try { await ctx.editMessageText(rejectedText); } catch {}
      }
      try { await ctx.answerCbQuery(); } catch {}
      return;
    }

    if (callbackData.startsWith('confirm_') || callbackData.startsWith('reject_')) {
      const parts = callbackData.split('_');
      const workSlotId = parseInt(parts[parts.length - 1]);
      if (!isNaN(workSlotId)) {
        const isConfirmed = callbackData.startsWith('confirm_');
        await db.update(workSlots).set({
          isConfirmed,
          adminUpdateStatus: isConfirmed ? 'accepted' : 'rejected',
        }).where(eq(workSlots.id, workSlotId));

        if (!isConfirmed) {
          const slotData = await db.select().from(workSlots).where(eq(workSlots.id, workSlotId)).limit(1);
          if (slotData.length > 0) {
            const master = await isMaster(telegramId);
            if (master) {
              await db.insert(workSlotChangeRequests).values({
                workSlotId,
                masterId: master.id,
                type: 'master_rejection',
                suggestedWorkDate: slotData[0].workDate,
                suggestedStartTime: slotData[0].startTime,
                suggestedEndTime: slotData[0].endTime,
                status: 'pending',
                createdAt: new Date().toISOString(),
              });
            }
          }
        }

        const slotStatusText = await stepText(
          isConfirmed ? 'master_slot_confirmed' : 'master_slot_rejected',
          {},
          `Рабочий день ${isConfirmed ? '✅ подтвержден' : '❌ отклонен'}!`
        );
        try { await ctx.editMessageText(slotStatusText); } catch {}
        try { await ctx.answerCbQuery(); } catch {}
      }
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    try { await ctx.answerCbQuery('Произошла ошибка'); } catch {}
  }
});

// Register engine flows (handles s:<stepId> navigation + useReplyKeyboard from admin UI)
registerEngine(bot, 'masters').catch((e) => console.error('[masters-bot] engine init error:', e));

// ── Launch ────────────────────────────────────────────────────

bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log('[masters-bot] Stopped.');
}).catch((error) => {
  console.error('[masters-bot] Failed to start:', error);
});
console.log('[masters-bot] Bot launched, listening for messages...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
