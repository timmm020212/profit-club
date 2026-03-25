# Appointment Edit Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline appointment edit flow (master → date → time) and per-appointment buttons in "Мои записи" — all within the Telegram bot webhook handler.

**Architecture:** All state is encoded in `callback_data` strings (max 64 bytes). No DB reads for state. Available slots are computed via direct DB queries inside the bot handler (reusing logic from `/api/available-slots`). All changes are in one file.

**Tech Stack:** Telegraf, Drizzle ORM, PostgreSQL (Supabase), Next.js App Router webhook

---

## Files

- **Modify:** `app/api/telegram/client/route.ts` — add slot helper, update `my_appointments` handler, add all edit-flow handlers

---

## Callback Data Format

```
em:<aptId>                          — start edit, show master list
em_m:<aptId>:<masterId>:<offset>    — master chosen, show dates (offset = days from today)
em_dt:<aptId>:<masterId>:<date>     — date chosen, show time slots
em_t:<aptId>:<masterId>:<date>:<t>  — time chosen, apply update
```

---

### Task 1: Add `getAvailableSlots` helper inside `createClientBot`

**Files:**
- Modify: `app/api/telegram/client/route.ts`

- [ ] Add these helper functions inside `createClientBot`, before any `bot.action` calls:

```ts
function timeToMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minsToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

async function getAvailableSlots(masterId: number, serviceId: number, date: string, excludeAptId?: number): Promise<string[]> {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const dateObj = new Date(date + "T00:00:00");
  const todayObj = new Date(todayStr + "T00:00:00");
  const diffDays = Math.round((dateObj.getTime() - todayObj.getTime()) / 86400000);

  const svc = await db.select({ duration: services.duration }).from(services).where(eq(services.id, serviceId)).limit(1);
  if (!svc.length) return [];
  const duration = svc[0].duration;

  const workDay = await db.select().from(workSlots)
    .where(and(eq(workSlots.masterId, masterId), eq(workSlots.workDate, date), eq(workSlots.isConfirmed, true)))
    .limit(1);

  let workStart: number, workEnd: number;
  if (workDay.length > 0) {
    workStart = timeToMins(workDay[0].startTime);
    workEnd = timeToMins(workDay[0].endTime);
  } else if (diffDays >= 2) {
    workStart = 8 * 60; workEnd = 20 * 60;
  } else {
    return [];
  }

  const booked = await db.select({ id: appointments.id, startTime: appointments.startTime, endTime: appointments.endTime })
    .from(appointments)
    .where(and(
      eq(appointments.masterId, masterId),
      eq(appointments.appointmentDate, date),
      eq(appointments.status, "confirmed")
    ));

  const busySlots = booked
    .filter(b => b.id !== excludeAptId)
    .map(b => ({ start: timeToMins(b.startTime), end: timeToMins(b.endTime) }));

  const slots: string[] = [];
  for (let t = workStart; t + duration <= workEnd; t += 30) {
    const end = t + duration;
    const overlap = busySlots.some(b => t < b.end && b.start < end);
    if (!overlap) slots.push(minsToTime(t));
  }
  return slots;
}
```

- [ ] Commit: `git add app/api/telegram/client/route.ts && git commit -m "feat: add getAvailableSlots helper in bot"`

---

### Task 2: Update `my_appointments` to show per-appointment Edit/Cancel buttons

**Files:**
- Modify: `app/api/telegram/client/route.ts` — replace `my_appointments` handler body

- [ ] Replace the text-building loop in `my_appointments` handler. After fetching `myAppts`, instead of building one text block, build per-appointment text + buttons:

```ts
// Replace the text loop + editMessageText with this:
const lines: string[] = [];
const keyboard: any[][] = [];

for (const apt of myAppts) {
  const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId));
  const [mst] = await db.select({ fullName: masters.fullName }).from(masters).where(eq(masters.id, apt.masterId));
  const d = new Date(apt.appointmentDate + "T00:00:00");
  const dateStr = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });
  lines.push(`💆 ${svc?.name || "Услуга"} — ${mst?.fullName || "Мастер"}\n📅 ${dateStr}, ${apt.startTime}–${apt.endTime}`);
  keyboard.push([
    Markup.button.callback("✏️ Изменить", `em:${apt.id}`),
    Markup.button.callback("❌ Отменить", `ap_cancel:${apt.id}`),
  ]);
}
keyboard.push([Markup.button.callback("← Главное меню", "menu")]);

const text = "📋 Ваши записи:\n\n" + lines.join("\n\n");
try {
  await ctx.editMessageText(text, Markup.inlineKeyboard(keyboard));
} catch {
  await ctx.reply(text, Markup.inlineKeyboard(keyboard));
}
```

- [ ] Test: send `/start` → "Мои записи" — проверь что кнопки Edit/Cancel появились под каждой записью
- [ ] Commit: `git add app/api/telegram/client/route.ts && git commit -m "feat: add edit/cancel buttons per appointment in my_appointments"`

---

### Task 3: Edit flow — Step 1: Master selection (`em:<aptId>`)

**Files:**
- Modify: `app/api/telegram/client/route.ts` — replace existing `ap_edit` handler

- [ ] Replace the existing `bot.action(/^ap_edit:(\d+)$/)` handler with:

```ts
bot.action(/^em:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const aptId = parseInt(ctx.match[1]);
  try {
    const [apt] = await db.select().from(appointments).where(eq(appointments.id, aptId)).limit(1);
    if (!apt) { await ctx.answerCbQuery("Запись не найдена"); return; }

    if (new Date(apt.appointmentDate + "T" + apt.startTime + ":00").getTime() - Date.now() < 2 * 60 * 60 * 1000) {
      try { await ctx.editMessageText("⚠️ Изменение невозможно — до записи менее 2 часов.", Markup.inlineKeyboard([[Markup.button.callback("← Назад", "my_appointments")]])); }
      catch { await ctx.reply("⚠️ Изменение невозможно — до записи менее 2 часов."); }
      return;
    }

    // Get masters with same specialization as original master
    const [origMaster] = await db.select({ specialization: masters.specialization }).from(masters).where(eq(masters.id, apt.masterId)).limit(1);
    const availMasters = await db.select({ id: masters.id, fullName: masters.fullName })
      .from(masters)
      .where(and(eq(masters.specialization, origMaster?.specialization || ""), eq(masters.isActive, true)));

    // Current master first
    const sorted = [
      ...availMasters.filter(m => m.id === apt.masterId),
      ...availMasters.filter(m => m.id !== apt.masterId),
    ];

    const keyboard = sorted.map(m => [
      Markup.button.callback(
        m.id === apt.masterId ? `👤 ${m.fullName} (текущий)` : m.fullName,
        `em_m:${aptId}:${m.id}:0`
      )
    ]);
    keyboard.push([Markup.button.callback("← Назад", "my_appointments")]);

    try { await ctx.editMessageText("👤 Выберите мастера:", Markup.inlineKeyboard(keyboard)); }
    catch { await ctx.reply("👤 Выберите мастера:", Markup.inlineKeyboard(keyboard)); }
  } catch (e) { console.error("[em] error:", e); }
});
```

- [ ] Add `workSlots` to the import on line 4 of `route.ts`: `import { clients, ..., workSlots } from "@/db/schema"`
- [ ] Remove the second `ctx.answerCbQuery("Запись не найдена")` call — the first unconditional call at top already answers the query; use `return` only
- [ ] Also remove old `ap_edit` handler (lines with `bot.action(/^ap_edit:(\d+)$/)`)
- [ ] Commit: `git add app/api/telegram/client/route.ts && git commit -m "feat: add master selection step for appointment edit"`

---

### Task 4: Edit flow — Step 2: Date selection with pagination (`em_m:<aptId>:<masterId>:<offset>`)

**Files:**
- Modify: `app/api/telegram/client/route.ts`

- [ ] Add handler after the master selection handler:

```ts
bot.action(/^em_m:(\d+):(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const aptId = parseInt(ctx.match[1]);
  const masterId = parseInt(ctx.match[2]);
  const offset = parseInt(ctx.match[3]); // days offset from today

  const today = new Date();
  const keyboard: any[][] = [];

  // Show 2 dates starting from offset
  for (let i = 0; i < 2; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset + i);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${y}-${mo}-${day}`;

    let label: string;
    if (offset + i === 0) label = "Сегодня";
    else if (offset + i === 1) label = "Завтра";
    else label = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

    keyboard.push([Markup.button.callback(label, `em_dt:${aptId}:${masterId}:${dateStr}`)]);
  }

  // Navigation row
  const navRow: any[] = [];
  if (offset > 0) navRow.push(Markup.button.callback("←", `em_m:${aptId}:${masterId}:${offset - 2}`));
  navRow.push(Markup.button.callback("→", `em_m:${aptId}:${masterId}:${offset + 2}`));
  keyboard.push(navRow);
  keyboard.push([Markup.button.callback("← Назад", `em:${aptId}`)]);

  try { await ctx.editMessageText("📅 Выберите дату:", Markup.inlineKeyboard(keyboard)); }
  catch { await ctx.reply("📅 Выберите дату:", Markup.inlineKeyboard(keyboard)); }
});
```

- [ ] Commit: `git add app/api/telegram/client/route.ts && git commit -m "feat: add date selection with pagination for appointment edit"`

---

### Task 5: Edit flow — Step 3: Time slot selection (`em_dt:<aptId>:<masterId>:<date>`)

**Files:**
- Modify: `app/api/telegram/client/route.ts`

- [ ] Add handler:

```ts
bot.action(/^em_dt:(\d+):(\d+):(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
  await ctx.answerCbQuery();
  const aptId = parseInt(ctx.match[1]);
  const masterId = parseInt(ctx.match[2]);
  const date = ctx.match[3];

  try {
    const [apt] = await db.select({ serviceId: appointments.serviceId }).from(appointments)
      .where(eq(appointments.id, aptId)).limit(1);
    if (!apt) { await ctx.answerCbQuery("Запись не найдена"); return; }

    const slots = await getAvailableSlots(masterId, apt.serviceId, date, aptId);

    if (slots.length === 0) {
      try {
        await ctx.editMessageText(
          "😔 На эту дату нет доступных слотов. Выберите другую дату:",
          Markup.inlineKeyboard([[Markup.button.callback("← Назад", `em_m:${aptId}:${masterId}:0`)]])
        );
      } catch { await ctx.reply("😔 На эту дату нет доступных слотов."); }
      return;
    }

    // Show slots in rows of 3
    const rows: any[][] = [];
    for (let i = 0; i < slots.length; i += 3) {
      rows.push(slots.slice(i, i + 3).map(t =>
        Markup.button.callback(t, `em_t:${aptId}:${masterId}:${date}:${t}`)
      ));
    }
    rows.push([Markup.button.callback("← Назад", `em_m:${aptId}:${masterId}:0`)]);

    try { await ctx.editMessageText("🕒 Выберите время:", Markup.inlineKeyboard(rows)); }
    catch { await ctx.reply("🕒 Выберите время:", Markup.inlineKeyboard(rows)); }
  } catch (e) { console.error("[em_dt] error:", e); }
});
```

- [ ] Commit: `git add app/api/telegram/client/route.ts && git commit -m "feat: add time slot selection for appointment edit"`

---

### Task 6: Edit flow — Step 4: Apply update (`em_t:<aptId>:<masterId>:<date>:<time>`)

**Files:**
- Modify: `app/api/telegram/client/route.ts`

- [ ] Add handler:

```ts
bot.action(/^em_t:(\d+):(\d+):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2})$/, async (ctx) => {
  await ctx.answerCbQuery();
  const aptId = parseInt(ctx.match[1]);
  const masterId = parseInt(ctx.match[2]);
  const date = ctx.match[3];
  const startTime = ctx.match[4];

  try {
    const [apt] = await db.select().from(appointments).where(eq(appointments.id, aptId)).limit(1);
    if (!apt) { await ctx.answerCbQuery("Запись не найдена"); return; }

    const [svc] = await db.select({ duration: services.duration, name: services.name })
      .from(services).where(eq(services.id, apt.serviceId)).limit(1);
    const endTime = minsToTime(timeToMins(startTime) + (svc?.duration || 60));

    const [mst] = await db.select({ fullName: masters.fullName })
      .from(masters).where(eq(masters.id, masterId)).limit(1);

    await db.update(appointments).set({
      masterId,
      appointmentDate: date,
      startTime,
      endTime,
      clientTelegramId: apt.clientTelegramId,
    }).where(eq(appointments.id, aptId));

    const d = new Date(date + "T00:00:00");
    const fDate = d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
    const canEdit = new Date(date + "T" + startTime + ":00").getTime() - Date.now() >= 2 * 60 * 60 * 1000;

    const text = `✅ Запись изменена!\n\n💆 Услуга: ${svc?.name || "Услуга"}\n👨‍💼 Мастер: ${mst?.fullName || "Мастер"}\n📅 Дата: ${fDate}\n🕒 Время: ${startTime}–${endTime}${canEdit ? "\n\n✏️ Вы можете изменить запись не позднее чем за 2 часа." : ""}\n\nЖдём вас в Profit Club!`;

    try {
      await ctx.editMessageText(text, Markup.inlineKeyboard([
        [Markup.button.callback("❌ Отменить запись", `ap_cancel:${aptId}`), Markup.button.callback("✏️ Изменить", `em:${aptId}`)],
        [Markup.button.callback("⬅️ В главное меню", "back_to_main_menu")],
      ]));
    } catch {
      await ctx.reply(text);
    }
  } catch (e) { console.error("[em_t] error:", e); }
});
```

- [ ] Commit: `git add app/api/telegram/client/route.ts && git commit -m "feat: apply appointment update and show confirmation"`

---

### Task 7: Push & deploy

- [ ] `git push origin main`
- [ ] Дождаться деплоя на Vercel/Dockhost
- [ ] Протестировать полный флоу: Мои записи → Изменить → выбор мастера → дата → время → подтверждение
- [ ] Протестировать пагинацию дат (кнопка →)
- [ ] Протестировать отмену записи с подтверждением
