import { Telegraf, Markup } from 'telegraf';
import { db } from "../../db/index-postgres";
import { optimizationMoves, appointments, services, masters } from "../../db/schema-postgres";
import { eq } from "drizzle-orm";

export function registerOptimizationHandlers(bot: Telegraf<any>) {
  // opt_accept_<moveId>
  bot.action(/^opt_accept_(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const moveId = parseInt(ctx.match[1]);

      // Load move
      const moveRows = await db.select().from(optimizationMoves).where(eq(optimizationMoves.id, moveId)).limit(1);
      if (!moveRows.length || moveRows[0].clientResponse !== "sent_to_client") {
        await ctx.editMessageText("Это предложение уже обработано.", Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "book_back_menu")]]));
        return;
      }

      // Update response
      await db.update(optimizationMoves).set({ clientResponse: "accepted" }).where(eq(optimizationMoves.id, moveId));

      // Get appointment info for confirmation message
      const apt = await db.select().from(appointments).where(eq(appointments.id, moveRows[0].appointmentId)).limit(1);
      const svc = apt.length ? await db.select().from(services).where(eq(services.id, apt[0].serviceId)).limit(1) : [];

      const serviceName = svc.length ? svc[0].name : "Услуга";
      const move = moveRows[0];

      await ctx.editMessageText(
        `✅ Вы согласились на перенос\n\n` +
        `💇 ${serviceName}\n` +
        `🕐 ${move.oldStartTime}–${move.oldEndTime} → ${move.newStartTime}–${move.newEndTime}\n\n` +
        `Спасибо! Мы обновим вашу запись.`,
        Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "book_back_menu")]])
      );
    } catch (e) {
      console.error("[optimization] accept error:", e);
      try { await ctx.answerCbQuery("Ошибка"); } catch {}
    }
  });

  // opt_decline_<moveId>
  bot.action(/^opt_decline_(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const moveId = parseInt(ctx.match[1]);

      const moveRows = await db.select().from(optimizationMoves).where(eq(optimizationMoves.id, moveId)).limit(1);
      if (!moveRows.length || moveRows[0].clientResponse !== "sent_to_client") {
        await ctx.editMessageText("Это предложение уже обработано.", Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "book_back_menu")]]));
        return;
      }

      await db.update(optimizationMoves).set({ clientResponse: "declined" }).where(eq(optimizationMoves.id, moveId));

      await ctx.editMessageText(
        `Хорошо, запись остаётся на прежнем времени.\n\n` +
        `🕐 ${moveRows[0].oldStartTime}–${moveRows[0].oldEndTime}`,
        Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "book_back_menu")]])
      );
    } catch (e) {
      console.error("[optimization] decline error:", e);
      try { await ctx.answerCbQuery("Ошибка"); } catch {}
    }
  });
}
