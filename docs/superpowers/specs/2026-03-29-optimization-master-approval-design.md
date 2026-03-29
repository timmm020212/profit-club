# Optimization Master Approval — Design Spec

## Summary

Add master approval step to schedule optimization flow. Before sending proposals to clients, each move is first approved by the master. Master approves/declines each move individually.

## New Flow

```
Algorithm creates moves → Each move sent to master → Master approves/declines each →
Approved moves sent to client → Client accepts/declines → Admin applies accepted
```

## Status Chain (per move)

| Status | Color | Badge | Meaning |
|--------|-------|-------|---------|
| draft | #9CA3AF gray | Черновик | Just computed, not sent yet |
| awaiting_master | #8B5CF6 violet | Ожидает мастера | Sent to master, waiting response |
| master_accepted | #3B82F6 blue | Мастер одобрил | Master agreed to this move |
| master_declined | #EF4444 red | Отклонено мастером | Master refused |
| sent_to_client | #F59E0B orange | Отправлено клиенту | Proposal sent to client |
| accepted | #22C55E green | Клиент согласен | Client accepted |
| declined | #EF4444 red | Клиент отказался | Client refused |

## Schema Changes

### `optimizationMoves` table

Change `clientResponse` field semantics — rename conceptually to `moveStatus` but keep the column name for backward compatibility. New possible values:

- `draft` — just created (was "pending")
- `awaiting_master` — sent to master
- `master_accepted` — master approved
- `master_declined` — master declined
- `sent_to_client` — sent to client (was "pending" after send)
- `accepted` — client accepted
- `declined` — client declined

Add new field:
- `masterRespondedAt` — text, nullable. When master responded.

## Master Bot Changes

### New callback handlers in `masters-bot-full.ts`:

- `opt_master_accept_[moveId]` — master approves move
- `opt_master_decline_[moveId]` — master declines move

### Master notification message (one per move):

```
🔄 Предложение по оптимизации

💇 [Service] — [Client]
❌ Сейчас: [oldStart]–[oldEnd]
✅ Предлагается: [newStart]–[newEnd]

Согласны на перенос?
[✅ Согласен] [❌ Отклонить]
```

## Send Flow Changes

### Current flow (POST /api/admin/optimize-schedule/send):
Sends directly to clients.

### New flow:
1. Send to **master** first (via masters bot)
2. Each move gets status `awaiting_master`
3. Master responds per move
4. `master_accepted` moves can then be sent to clients (admin clicks "Отправить клиентам")
5. `master_declined` moves stay declined, shown in admin with red badge

### Two-stage send in admin:
- **"Отправить мастеру"** — sends proposals to master, status → `awaiting_master`
- **"Отправить клиентам"** — only for `master_accepted` moves, status → `sent_to_client`

## Admin Panel Changes

### Status badges with colors on each move:
All 7 statuses displayed as colored badge pills with text labels.

### Buttons:
- Draft stage: "Отправить мастеру" button
- After master responds: "Отправить клиентам" button (only if any master_accepted)
- After client responds: "Применить согласованные" button (only if any accepted)

## Auto-Optimization Changes

In `reminders.ts` auto-optimize section:
1. After draft delay passes → send to **master** (not client)
2. After master responds → auto-send accepted moves to clients
3. After client responds → admin applies manually

## File Changes

```
db/schema-postgres.ts                              — ADD masterRespondedAt to optimizationMoves
telegram-bot/masters-bot-full.ts                    — ADD opt_master_accept/decline handlers
telegram-bot/client/reminders.ts                    — MODIFY auto-optimize to send to master first
app/api/admin/optimize-schedule/send/route.ts       — MODIFY to support sendTo=master|client
components/AdminScheduleOptimizer.tsx                — ADD master approval statuses, two-stage buttons, badges
```
