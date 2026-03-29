# Appointment Status Tracking — Design Spec

## Summary

Real-time appointment status tracking with master/client confirmation flow. Masters get notified when appointments start and can mark them complete. Clients confirm completion. Auto-completion with admin notification if no response.

## Status Chain

```
confirmed → in_progress → completed_by_master → completed
```

| Status | Trigger | Color (border) | Color (badge) | Label |
|--------|---------|---------------|--------------|-------|
| confirmed | Appointment created | #9CA3AF (gray) | gray | Подтверждена |
| in_progress | startTime reached | #3B82F6 (blue) | blue | В процессе |
| completed_by_master | Master clicks "Завершить" or auto 15min after endTime | #F59E0B (orange) | orange | Ожидает подтверждения |
| completed | Client confirms or auto 1hr after completed_by_master | #22C55E (green) | green | Завершена |
| completed (auto) | Client didn't respond in 1hr | #22C55E (green) | green | Завершена (авто) |

## Flow

### 1. Start notification (startTime reached)
- Timer finds `confirmed` appointments where `startTime <= now`
- Status → `in_progress`
- Masters bot sends: "🔔 Запись началась!\n💇 [service] — [client]\n⏰ [startTime]–[endTime]" with button "✅ Завершить запись" (`complete_apt_ID`)

### 2. Master completes
- Master taps "✅ Завершить" → status → `completed_by_master`, set `completedByMasterAt` timestamp
- Client bot sends: "✅ Мастер завершил вашу запись\n💇 [service]\n⏰ [time]\n\nПодтвердите завершение:" with buttons "✅ Подтверждаю" (`confirm_complete_ID`) / "❌ Не согласен" (`dispute_complete_ID`)

### 3. Auto-complete by master (15 min after endTime)
- Timer finds `in_progress` appointments where `endTime + 15min <= now`
- Same as step 2 but automatic — status → `completed_by_master`

### 4. Client confirms
- Client taps "✅ Подтверждаю" → status → `completed`
- Message edited to "✅ Запись завершена!"

### 5. Client disputes
- Client taps "❌ Не согласен" → admin gets notification, status stays `completed_by_master`

### 6. Auto-complete by client (1 hour)
- Timer finds `completed_by_master` where `completedByMasterAt + 1hr <= now`
- Status → `completed`, set `autoCompleted = true`
- Admin notification: "⚠️ Запись #ID завершена автоматически — клиент не подтвердил"

## Schema Changes

Add to `appointments` table:
- `completedByMasterAt` — text, nullable. Timestamp when master completed
- `autoCompleted` — boolean, default false. True if client didn't confirm

No new tables needed — status field already exists as varchar.

## Timer Integration

Add to existing reminder loop in `client-simple.ts` (runs every minute):
1. Check `confirmed` appointments where `startTime` reached → transition to `in_progress`, notify master
2. Check `in_progress` appointments where `endTime + 15min` passed → transition to `completed_by_master`, notify client
3. Check `completed_by_master` where `completedByMasterAt + 1hr` passed → transition to `completed (auto)`, notify admin

## Visual Changes

### Master mini-app (MasterDaySchedule)
- Border-left color changes by status
- Small status badge text under service name

### Admin panel
- Border-left color on appointment cards
- Badge pill next to appointment info
- Filter by status (optional, future)

### Master bot schedule
- Emoji prefix per status: ⬜ confirmed, 🔵 in_progress, 🟡 completed_by_master, ✅ completed

## API Changes

- `GET /api/master/schedule` — already returns status, add `completedByMasterAt` and `autoCompleted`
- Callback handlers in both bots for complete/confirm buttons

## File Changes

```
db/schema-postgres.ts                    — ADD completedByMasterAt, autoCompleted to appointments
telegram-bot/client-simple.ts            — ADD timer checks, client confirm/dispute handlers
telegram-bot/masters-bot-full.ts         — ADD complete_apt callback handler
components/master/MasterDaySchedule.tsx   — Status colors and badges
app/(app)/admin/page.tsx                 — Status colors and badges on admin appointments
```
