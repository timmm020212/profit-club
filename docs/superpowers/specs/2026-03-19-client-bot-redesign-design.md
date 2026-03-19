# Client Telegram Bot — Full Redesign

## Overview

Расширение клиентского Telegram-бота Profit Club: полноценная запись на услуги, управление записями (отмена/перенос), напоминания за 24ч и 2ч, уведомления мастерам. Модульная архитектура.

## Architecture

Точка входа — `telegram-bot/client-simple.ts`. Логика разнесена по модулям:

```
telegram-bot/
  client-simple.ts          — entry point, bot init, main menu, registration (existing)
  client/
    booking-flow.ts         — пошаговая запись: категория → услуга → мастер → дата → время → подтверждение
    appointment-manager.ts  — просмотр, отмена, перенос записей
    reminders.ts            — фоновый loop напоминаний (setInterval 5 мин)
    notify-master.ts        — отправка уведомлений мастеру через MASTERS_BOT_TOKEN
```

Все модули используют `import { db } from "../db/index-sqlite"` и общую схему.

## Booking Flow

Пошаговая запись через inline-кнопки. State хранится в `Map<string, BookingState>`.

```
BookingState {
  step: "category" | "service" | "master" | "date" | "time" | "confirm"
  categoryName?: string
  serviceId?: number
  serviceName?: string
  serviceDuration?: number
  servicePrice?: string
  masterId?: number
  masterName?: string
  date?: string          // YYYY-MM-DD
  startTime?: string     // HH:MM
  endTime?: string       // HH:MM
}
```

### Steps

1. **"Записаться"** → список категорий (из `services`, уникальные `category`)
2. **Категория** → услуги в этой категории (название, цена, длительность)
3. **Услуга** → подходящие мастера (match `executorRole` ↔ `specialization`, substring case-insensitive)
4. **Мастер** → ближайшие 7 дней с available slots (только дни с confirmed `workSlots`)
5. **Дата** → свободные временные слоты (логика из `available-slots` route: слоты каждые 30 мин, проверка пересечений с existing appointments)
6. **Время** → карточка подтверждения
7. **Подтверждение** → `INSERT` в `appointments`, уведомление мастеру, сообщение клиенту

Каждый шаг имеет кнопку "← Назад".

### Role Matching

Та же логика что в `/api/available-slots`:
- `executorRole` услуги split по `,`, trim, lowercase
- `specialization` мастера split по `,`, trim, lowercase
- Match: любой token мастера `includes` token роли или наоборот

### Slot Generation

Повторяет логику `/api/available-slots`:
- Только confirmed `workSlots` (для любых дат)
- Интервал 30 мин
- Проверка пересечений с `appointments` (status = "confirmed")
- Пропуск прошедшего времени для сегодняшней даты

## Appointment Management

### Просмотр ("Мои записи")

Запрос `appointments` где `clientTelegramId = telegramId` AND `status = "confirmed"` AND дата >= сегодня. Сортировка по дате/времени.

Каждая запись — сообщение с inline-кнопками:

```
📅 25 марта, 14:00–15:00
💇 Стрижка женская
👩 Маргарита Дереглазова
💰 2500 ₽

[Перенести] [Отменить]
```

### Отмена

- Проверка: до записи > 2 часов
- Если нет → "Отмена возможна не позднее чем за 2 часа до записи"
- Если да → подтверждение "Да, отменить" / "Нет, оставить"
- При подтверждении: `UPDATE appointments SET status = 'cancelled'`, уведомление мастеру

### Перенос

- Проверка: до записи > 2 часов
- Если нет → отказ
- Если да → запуск booking flow с предвыбранной услугой и мастером (начинаем с шага 4 — выбор даты)
- Старая запись отменяется **после** подтверждения новой (атомарно)

## Reminders

Фоновый loop внутри процесса бота (`setInterval`, 5 мин).

### Логика

1. Запрос `appointments` со статусом `confirmed`, дата/время в будущем
2. Для каждой записи вычислить разницу до начала
3. Если попадает в окно:
   - **24 часа** (23ч55м – 24ч05м) → `reminderType: "24hour"`
   - **2 часа** (1ч55м – 2ч05м) → `reminderType: "2hour"`
4. Проверить `reminderSent` — если для `appointmentId + reminderType` уже есть запись → пропустить
5. Отправить сообщение клиенту
6. Записать в `reminderSent`

### Сообщения

**24-часовое:**
```
⏰ Напоминание о записи

📅 Завтра, 25 марта, 14:00
💇 Стрижка женская
👩 Маргарита Дереглазова
📍 Profit Club

[Отменить запись]
```

**2-часовое:**
```
⏰ Скоро запись!

📅 Сегодня, 14:00
💇 Стрижка женская
👩 Маргарита Дереглазова
📍 Profit Club

[Отменить запись]
```

Кнопка "Отменить запись" — только если до записи > 2 часов (для 24ч напоминания всегда, для 2ч — проверять).

## Master Notifications

Отправка через `MASTERS_BOT_TOKEN` (HTTP POST к Telegram API). Не через бот мастеров — напрямую.

### Новая запись
```
📌 Новая запись

👤 Мария К. (+7 999 123-45-67)
💇 Стрижка женская
📅 25 марта, 14:00–15:00
```

### Отмена
```
❌ Запись отменена

👤 Мария К.
💇 Стрижка женская
📅 25 марта, 14:00–15:00
```

Отправляем только если `master.telegramId` заполнен. Ошибка отправки не блокирует операцию.

## Synchronization

Единый источник правды — SQLite БД (`profit_club.db`). Бот, сайт, админка читают/пишут в одни таблицы:
- `appointments` — записи
- `workSlots` — рабочие дни
- `services` — услуги
- `masters` — мастера
- `clients` — клиенты
- `reminderSent` — отправленные напоминания

Нет кеширования, нет дублирования данных.

## Database Changes

Нет новых таблиц. Используем существующие:
- `appointments` — новые записи через бота
- `reminderSent` — трекинг отправленных напоминаний (таблица уже есть)

## Entry Point Changes

`client-simple.ts`:
- Импортирует модули из `client/`
- Регистрирует callback handlers для booking и management
- Запускает reminder loop при старте бота
- Существующая логика (регистрация, меню) остаётся

## Error Handling

- Все DB-операции в try/catch
- При ошибке — сообщение пользователю "Произошла ошибка, попробуйте позже"
- Reminder loop: ошибка на одном напоминании не останавливает остальные
- Notify master: ошибка не блокирует основную операцию
