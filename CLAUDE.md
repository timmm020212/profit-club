# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Документация — читай перед любой работой

- `ИДЕЯ_ПРОЕКТА.md` — зачем проект, бизнес-логика, аудитория
- `СПЕЦИФИКАЦИЯ.md` — таблицы БД, API эндпойнты, потоки данных
- `СТРУКТУРА_ПРОЕКТА.md` — где что находится в файловой системе
- `ПЛАН_РАЗВИТИЯ.md` — следующие задачи, миграция на PostgreSQL

## Команды

```bash
npm run dev              # Next.js сервер (0.0.0.0:3000)
npm run bot:client       # Клиентский Telegram-бот
npm run bot:masters      # Бот мастеров
npm run bot:start        # Бот администратора
npm run db:push          # Применить схему к SQLite
npm run db:studio        # Drizzle Studio (просмотр БД)
npm run db:seed          # Заполнить тестовыми услугами
npm run db:seed-masters  # Заполнить мастерами
npm run reminders:send   # Отправить напоминания вручную
npm run test:appointment # Добавить тестовую запись
npm run build            # Production сборка
```

## Стек

**Next.js 15 App Router · TypeScript · Tailwind · SQLite → PostgreSQL (план) · NextAuth v4 · Telegraf**

## Критические правила

**БД-импорт в Next.js:** `import { db } from "@/db"` (реэкспорт из `db/index-sqlite.ts`)
**БД-импорт в ботах:** `import { db } from "../db/index-sqlite"` — НЕ из `../db`
**Схема:** `db/schema-sqlite.ts`. Ключевые таблицы: `services`, `masters`, `appointments`, `workSlots`, `clients`, `pendingClients`, `telegramVerificationCodes`.

**Даты:** всегда `getFullYear/getMonth/getDate`. НИКОГДА `toISOString().slice(0,10)` — timezone bug.
**Модалки:** через `createPortal(modal, document.body)` c `z-[9999]` (backdrop-filter ломает z-index).
**Боты:** один инстанс. При 409 Conflict — `taskkill /F /IM node.exe`, перезапустить.
**duration на services:** хранится как integer (минуты), всегда сохранять как число.

## Booking flow

1. Admin создаёт `workSlots` → мастер подтверждает через `confirm_X`/`reject_X` в боте
2. Клиент: `/booking/[serviceId]` → `BookingModal` → `GET /api/available-slots` → `POST /api/appointments`
3. Логика слотов: даты ≤1 дня — только `isConfirmed=true` workSlot; даты 2+ дней — confirmed slot или 08:00–20:00
4. Debug: `?debug=1` к `/api/available-slots` — verbose JSON с reason-кодами
5. Роль-матчинг: substring match `executorRole` в `specialization` (регистронезависимо)

## Change requests

- Мастер → `type="time_change"` → видно в AdminWorkSlotChangeRequests
- Admin → `type="admin_update"`, `mode="create_from_admin"` → фильтруется из панели, уведомление мастеру (`confirm_request_X`/`reject_request_X`)

## Client registration

Site-initiated: `/api/clients/register` → `pendingClients` + code → бот `/start CODE` → `clients` с telegramId
Bot-initiated: бот → `telegramVerificationCodes` → ссылка `SITE_URL/?tg_code=CODE` → сайт авто-линкует после регистрации

## Auth

Admin: NextAuth v4 credentials → `admins`. Config: `lib/auth.ts`. Middleware: `middleware.ts`. API-check: `lib/requireAdminSession.ts`.
Clients: phone + bcrypt → `clients`. Telegram: `telegramVerificationCodes`.

## Design

Admin: `bg-[#0D0D11]`, violet/indigo. Client: `bg-[#09090D]`, `#B2223C → #e8556e`.
Fonts: `var(--font-playfair)` заголовки, `var(--font-montserrat)` UI.
