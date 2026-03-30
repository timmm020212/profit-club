# Break Notifications Cleanup — Design Spec

**Date:** 2026-03-30
**Status:** Approved

## Summary

Consolidate break notifications: morning summary at shift start (already implemented) + instant notification only when a break is added for today.

## Changes

### 1. Restore instant break notification in schedule-block API (today only)

In `app/api/admin/schedule-block/route.ts` POST handler, restore the Telegram notification to master when a break/block is created, but **only if `date` equals today** (Moscow timezone). Breaks added for future days will come via the morning summary.

### 2. Remove unused functions from notify-master.ts

Remove `detectBreaks()`, `notifyMasterBreak()`, and `notifyMasterEarlyFinish()` from `telegram-bot/client/notify-master.ts` — they are not called anywhere and the functionality is replaced by the morning summary + schedule-block instant notification.

## Files Affected

| File | Action |
|------|--------|
| `app/api/admin/schedule-block/route.ts` | **Edit** — add back break notification with today-only check |
| `telegram-bot/client/notify-master.ts` | **Edit** — remove unused `detectBreaks`, `notifyMasterBreak`, `notifyMasterEarlyFinish` |
