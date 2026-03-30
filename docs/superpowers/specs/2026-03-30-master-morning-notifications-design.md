# Master Morning Notifications — Design Spec

**Date:** 2026-03-30
**Status:** Approved

## Summary

Replace instant break notifications with a single morning summary sent to each master at the start of their shift. The message includes all scheduled breaks and early finish info for the day.

## What Changes

### Remove
- Instant Telegram notification about breaks in `app/api/admin/schedule-block/route.ts` POST handler (the block that sends "☕ Перерыв запланирован" to master)

### Add
- New cron endpoint: `GET /api/cron/master-morning`
- Called every 5 minutes by external cron service
- Authenticated via `CRON_SECRET` bearer token (same as existing cron)

## Cron Logic

Each invocation:

1. **Get current time** in Moscow timezone (UTC+3)
2. **Query confirmed `workSlots`** for today's date
3. **Filter:** only slots where `startTime` falls in window `[now - 5min, now]`
4. **Deduplication:** check `reminderSent` table for slug `master_morning_{masterId}_{date}` — skip if already sent
5. **Check master settings:** read `notificationSettings` from `masters` table, skip if `morningReminder` is not enabled (default: OFF)
6. **Collect data:**
   - Breaks: `scheduleBlocks` where `blockDate = today` and `masterId = master.id`
   - Appointments: `appointments` where `appointmentDate = today` and `masterId = master.id`, status = `confirmed`
   - Last appointment end time vs shift end time → early finish detection
7. **Format message** (see template below)
8. **Send** via Telegram API using `MASTERS_BOT_TOKEN`
9. **Record** in `reminderSent` table to prevent duplicates

## Message Format

```
📋 Ваш день на сегодня

📅 {date}, {shiftStart}–{shiftEnd}

☕ Перерывы:
• {breakStart}–{breakEnd}
• {breakStart}–{breakEnd}

🏁 Последняя запись заканчивается в {lastAppEnd}
   Свободны с {lastAppEnd} (смена до {shiftEnd})
```

### Conditional blocks:
- **No breaks:** omit the `☕ Перерывы` section entirely
- **No appointments:** replace appointment info with "Записей пока нет"
- **Last appointment ends at shift end:** omit the `🏁` section
- **Early finish** (last appointment ends before shift end): show `🏁` section

## Master Settings

Uses existing `morningReminder` toggle in `masters.notificationSettings` JSON field. Default: `false` (OFF). Master enables it through the bot settings menu (already exists in UI).

## Deduplication

Uses existing `reminderSent` table:
- `appointmentId`: use negative masterId (e.g. `-7`) to avoid collision with real appointments and to identify the master
- `reminderType`: `"master_morning"`
- `sentAt`: today's date as ISO string

Before sending, query: `WHERE appointmentId = -masterId AND reminderType = 'master_morning' AND sentAt LIKE '{today}%'`. If row exists — skip.

## Timezone

All time comparisons use Moscow time (UTC+3). Use `new Date()` offset or `Intl.DateTimeFormat` with `timeZone: "Europe/Moscow"`.

## Files Affected

| File | Action |
|------|--------|
| `app/api/cron/master-morning/route.ts` | **New** — cron endpoint |
| `app/api/admin/schedule-block/route.ts` | **Edit** — remove instant break notification to master |

## External Setup

After deployment, configure external cron service to call:
```
GET /api/cron/master-morning
Authorization: Bearer {CRON_SECRET}
```
Every 5 minutes.
