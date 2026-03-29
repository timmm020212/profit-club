# Admin Schedule Control — Design Spec

## Summary

Full admin control over master schedules: create appointments directly (for phone/walk-in clients), add breaks, and custom blocks — all from the admin panel. Two entry points: click on empty timeline slot or global "Добавить" button.

## Block Types

| Type | Label | Color | Statuses | Notifications |
|------|-------|-------|----------|---------------|
| appointment | Запись (прямая) | wine-red `#B2223C` | confirmed → in_progress → completed (no client confirm) | Master only: start, complete button |
| break | Перерыв | blue `#3B82F6` | scheduled → active → finished | Master: start/end |
| custom | Custom text | gray `#9CA3AF` | scheduled → active → finished | Master: start/end |

## Direct Appointment (type=appointment)

- Admin fills: master, time (start/end), client name, client phone, service, comment
- **No client notifications** — client may not be registered
- Marked as `source: "admin"` to distinguish from site/miniapp bookings
- Master gets notification: "📋 Новая запись (прямая)\n💇 [service] — [client]\n⏰ [time]\n📝 Клиент записан напрямую"
- Status flow: `confirmed → in_progress → completed` (no `completed_by_master` step — goes straight to `completed` when master clicks "Завершить")
- Time blocked on site/miniapp — treated as occupied slot

## Break (type=break)

- Admin fills: master, time (start/end), comment (optional, e.g. "Обед")
- Master notified: "☕ Перерыв запланирован\n⏰ [time]\n📝 [comment]"
- Status: `scheduled → active → finished`
- Auto-transitions by timer (same as appointments)
- Shown on timeline as blue block

## Custom Block (type=custom)

- Admin fills: master, time (start/end), type name (free text), comment
- Master notified: "📌 [type name]\n⏰ [time]\n📝 [comment]"
- Status: `scheduled → active → finished`
- Shown on timeline as gray block

## Entry Points

### 1. Click on empty timeline slot
- Click on free space in master's column → pre-fills master and start time
- Opens modal with remaining fields

### 2. Global "Добавить промежуток" button
- Button above the schedule
- Opens modal → first step: select master → then fill type and details

## Schema Changes

### New table: `scheduleBlocks`

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| masterId | integer | FK → masters |
| blockDate | varchar(10) | YYYY-MM-DD |
| startTime | varchar(5) | HH:MM |
| endTime | varchar(5) | HH:MM |
| blockType | varchar(20) | "appointment", "break", or custom text |
| status | varchar(20) | "scheduled", "active", "finished" |
| clientName | varchar(255) | Only for appointments |
| clientPhone | varchar(50) | Only for appointments |
| serviceId | integer | Only for appointments, nullable |
| comment | text | Optional note |
| source | varchar(20) | "admin" |
| createdAt | text | |

For direct appointments: also insert into `appointments` table with `source: "admin"` so existing schedule logic works. The `scheduleBlocks` table is only for breaks and custom blocks.

Actually simpler approach: **add `source` and `blockType` fields to `appointments` table** for direct appointments, and use `scheduleBlocks` only for non-appointment blocks (breaks, custom).

### Add to `appointments` table:
- `source` — varchar(20), default "site". Values: "site", "miniapp", "admin"

### New table: `scheduleBlocks` (for breaks and custom)

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| masterId | integer | |
| blockDate | varchar(10) | |
| startTime | varchar(5) | |
| endTime | varchar(5) | |
| blockType | varchar(30) | "break" or custom text |
| status | varchar(20) | default "scheduled" |
| comment | text | |
| createdAt | text | |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/schedule-block` | Create block (break/custom) or direct appointment |
| GET | `/api/admin/schedule-block?date=X` | Get blocks for date |
| DELETE | `/api/admin/schedule-block?id=X` | Delete block |

## Admin UI Changes

### New button: "Добавить промежуток"
Above the schedule timeline, next to date selector.

### Timeline click handler
Click on empty space → detect master column and time position → open modal pre-filled.

### Modal: "Добавить в расписание"
1. Select master (if not pre-filled from timeline click)
2. Select type: Запись / Перерыв / Другое (text input for custom)
3. Time: start and end (time pickers)
4. If type=appointment: client name, phone, service dropdown, comment
5. If type=break: comment only
6. If type=custom: comment only
7. "Создать" button

### Timeline display
- Breaks shown as blue blocks with ☕ icon
- Custom blocks shown as gray blocks with 📌 icon
- Direct appointments shown same as regular but with small "📋" badge meaning "прямая запись"

## Status Tracker Changes

Add to `status-tracker.ts`:
- Check `scheduleBlocks` where `startTime` reached → status `active`
- Check `scheduleBlocks` where `endTime` reached → status `finished`

For direct appointments (`source=admin`):
- Same `confirmed → in_progress` transition
- Master gets "Завершить" button
- On master click → straight to `completed` (skip client confirmation)

## Master Notifications

### Direct appointment created:
```
📋 Новая запись (прямая)
💇 [service] — [client]
⏰ [startTime]–[endTime]
📝 Клиент записан напрямую
```

### Break created:
```
☕ Перерыв запланирован
⏰ [startTime]–[endTime]
📝 [comment]
```

### Custom block created:
```
📌 [blockType]
⏰ [startTime]–[endTime]
📝 [comment]
```

## File Changes

```
db/schema-postgres.ts                    — ADD source to appointments, ADD scheduleBlocks table
app/api/admin/schedule-block/route.ts    — POST/GET/DELETE for blocks and direct appointments
components/AdminAddBlockModal.tsx         — Modal for adding blocks
components/AdminAddBlockButton.tsx        — "Добавить промежуток" button
app/(app)/admin/page.tsx                 — Timeline click handler, show blocks, add button
telegram-bot/client/status-tracker.ts    — Block status transitions, direct appointment handling
```
