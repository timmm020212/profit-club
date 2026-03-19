# Schedule Optimization

## Overview

Автоматическая и ручная оптимизация расписания мастера — сдвиг записей ближе друг к другу чтобы минимизировать простои и сократить рабочее время мастера.

## Алгоритм

1. Загрузить все confirmed записи мастера на день + workSlot (смена)
2. Сортировать по startTime
3. Найти "разрывы" > 1 часа между записями (большие дыры, не перерывы < 30 мин)
4. Сдвинуть записи ближе друг к другу, формируя 1-2 компактных блока от начала смены
5. Сгенерировать план переносов: какие записи куда сдвигаются
6. Записи без разрывов не трогать

### Правила сдвига

- Не двигать запись если до неё < 2 часов (правило отмены/переноса)
- Сохранять порядок записей (не менять последовательность)
- Не выходить за рамки workSlot
- Перерывы < 30 мин между записями сохранять (они уже оптимальны)

## Админка

### Кнопка "Оптимизировать"

В расписании дня мастера — кнопка "⚡ Оптимизировать". При нажатии:

1. API вычисляет оптимальный план
2. Показывает два столбика: "Сейчас" и "Предложение" (визуально)
3. Админ может вручную изменить предложенное время (drag или edit)
4. Кнопка "Отправить предложения клиентам"
5. Статусы переносов обновляются в реальном времени

### Панель оптимизации

Карточка с:
- Список затронутых записей: старое время → новое время, имя клиента, статус ответа
- Статусы: 🕐 Ожидает / ✅ Согласился / ❌ Отказался
- При отказе — показать @username клиента (если есть) для связи в ЛС
- Кнопка "Применить согласованные" — переносит только те записи где клиент согласился

### Настройки автозапуска

В админке (отдельная секция):
- Вкл/выкл автоматическая оптимизация
- За сколько часов до дня запускать (по умолчанию 24)
- Режим: "Только показать админу" или "Авто-отправить клиентам"

## Клиент — уведомление в бот

```
🔄 Предложение о переносе

💇 Стрижка женская
👩 Маргарита Дереглазова

❌ Текущее время: 15:00–16:20
✅ Предлагаемое: 11:30–12:50

Это позволит оптимизировать расписание мастера.

[✅ Согласиться] [❌ Оставить как есть]
```

- Согласие: `PATCH` appointment с новым временем, уведомление мастеру
- Отказ: запись остаётся, админ видит статус + @username для ЛС
- Одна попытка на клиента (не спамим повторными предложениями)

## БД

### Новая таблица: `scheduleOptimizations`

| Поле | Тип | Описание |
|------|-----|----------|
| id | integer PK | |
| masterId | integer | FK masters |
| workDate | text | YYYY-MM-DD |
| status | text | "draft" / "sent" / "completed" |
| createdAt | text | ISO timestamp |
| sentAt | text | ISO timestamp (когда отправлены предложения) |

### Новая таблица: `optimizationMoves`

| Поле | Тип | Описание |
|------|-----|----------|
| id | integer PK | |
| optimizationId | integer | FK scheduleOptimizations |
| appointmentId | integer | FK appointments |
| oldStartTime | text | HH:MM |
| oldEndTime | text | HH:MM |
| newStartTime | text | HH:MM |
| newEndTime | text | HH:MM |
| clientResponse | text | "pending" / "accepted" / "declined" |
| sentAt | text | ISO timestamp |

## API

### `POST /api/admin/optimize-schedule`

Body: `{ masterId, workDate }`

Возвращает план оптимизации: список предлагаемых переносов.

### `POST /api/admin/optimize-schedule/send`

Body: `{ optimizationId }`

Отправляет предложения клиентам через бот.

### `PATCH /api/admin/optimize-schedule/move`

Body: `{ moveId, newStartTime, newEndTime }`

Админ вручную меняет предложенное время.

### `POST /api/admin/optimize-schedule/apply`

Body: `{ optimizationId }`

Применяет все accepted переносы.

## Бот клиента

Callback handlers:
- `opt_accept_<moveId>` — клиент согласился
- `opt_decline_<moveId>` — клиент отказался

## Файлы

### Новые
- `db/schema-sqlite.ts` — добавить 2 таблицы
- `app/api/admin/optimize-schedule/route.ts` — основной API
- `app/api/admin/optimize-schedule/send/route.ts` — отправка предложений
- `app/api/admin/optimize-schedule/move/route.ts` — ручное изменение
- `app/api/admin/optimize-schedule/apply/route.ts` — применение
- `components/AdminScheduleOptimizer.tsx` — UI оптимизации в админке
- `telegram-bot/client/optimization-handler.ts` — обработка ответов клиентов

### Модификации
- `telegram-bot/client-simple.ts` — подключить optimization handler
- `app/admin/page.tsx` — добавить кнопку оптимизации и панель
