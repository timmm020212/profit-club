# Preliminary Booking System — Design Spec

## Summary

When a client books an appointment 2+ days ahead and no work slot exists for that master/date, the appointment is created as "preliminary" (предварительная). It blocks the time slot for other clients. Admin sees preliminary bookings in a separate panel and confirms them when creating work slots.

## Flow

1. Client books for date 2+ days ahead → `/api/available-slots` shows 08:00–20:00 range (existing logic)
2. Appointment created with `status: "preliminary"` instead of `"confirmed"`
3. Time is blocked — other clients can't book the same slot
4. Master gets notification with "(предварительно)" label
5. Admin sees preliminary bookings in a dedicated panel
6. Admin creates work slot for that date → sees list of preliminary bookings
7. Admin checks boxes next to bookings that fit the work slot → they become `confirmed`
8. Bookings outside the work slot hours → marked as "problem" (визуально выделены)
9. Unconfirmed bookings stay preliminary — admin can confirm later

## Status

New appointment status value: `preliminary`

Existing statuses: confirmed → in_progress → completed_by_master → completed

New chain for preliminary: `preliminary` → (admin confirms) → `confirmed` → normal flow

## When to Create Preliminary

In `/api/appointments` POST handler:
- If the appointment date is 2+ days from today AND there's no confirmed work slot for that master/date → set `status: "preliminary"` instead of `"confirmed"`
- If there IS a confirmed work slot → `status: "confirmed"` as usual

## Blocking Time

In `/api/available-slots`:
- Already considers appointments with `status: "confirmed"` for overlap
- Also check `status: "preliminary"` appointments for overlap → both block time

## Admin Panel

### New section: "Предварительные записи"
Shows above or below the timeline. Lists all `preliminary` appointments for the selected date range (next 7 days).

Each row shows:
- Date, time, service, client name, master name
- Checkbox for confirming
- Status indicator:
  - Green border if fits within existing work slot
  - Red border if no work slot or outside work hours
  - Gray if no work slot exists yet

### Confirm button
"Подтвердить выбранные" → changes selected preliminary appointments to `confirmed`

### Auto-check on work slot creation
When admin creates a work slot → highlight which preliminary bookings now fit within that slot

## Master Notifications

When preliminary appointment created:
```
📋 Новая запись (предварительно)
💇 [service] — [client]
⏰ [time]
📅 [date]
📝 Запись предварительная — рабочий день ещё не создан
```

When admin confirms:
```
✅ Запись подтверждена
💇 [service] — [client]
⏰ [time]
📅 [date]
```

## Visual

### Admin panel
- Preliminary appointments in timeline: dashed border, faded color, "Предварительно" badge
- Separate panel with checkboxes for bulk confirm

### Master mini-app
- Shown as regular appointment cards but with gray/violet badge "Предварительно"

### Client
- No difference in client-facing UI — they see it as a normal booking

## Available Slots Changes

In `/api/available-slots`:
- Current logic: dates 2+ days → use confirmed work slot OR default 08:00–20:00
- Add: when checking overlap, include both `confirmed` AND `preliminary` appointments

## File Changes

```
app/api/appointments/route.ts            — MODIFY: set preliminary status when no work slot
app/api/available-slots/route.ts          — MODIFY: include preliminary in overlap check
components/AdminPreliminaryBookings.tsx    — NEW: panel with checkboxes for confirming
app/(app)/admin/page.tsx                  — MODIFY: add preliminary panel, fetch preliminary data
components/master/MasterDaySchedule.tsx    — MODIFY: add preliminary badge/color
components/AdminAppointmentManager.tsx     — MODIFY: add preliminary status color/badge
```
