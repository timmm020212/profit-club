# Masters Mini-App — Design Spec

## Summary

Telegram WebApp mini-application for masters (hairdressers, barbers, etc.) of Profit Club salon. Provides schedule management, statistics, finances, portfolio, and client base — features beyond what the existing Telegram bot offers. The bot remains for notifications and quick actions.

## Architecture

- **Approach:** New route group `app/(master)/master/` inside existing Next.js app with a dedicated light-theme layout
- **Auth:** Telegram `initData` via masters bot → match `telegramId` in `masters` table
- **Entry point:** Masters bot sends WebApp button linking to `NEXTAUTH_URL/master`

## Design System

- **Theme:** Light, clean, practical (white/gray backgrounds)
- **Accent:** Wine-red `#B2223C` / `#e8556e` (Profit Club brand)
- **Fonts:** Montserrat (headings, UI), Inter (body text)
- **Logo:** Original `logo1.png` in header (no color filter)
- **Icons:** SVG line-style (stroke-width 1.8), active=wine-red, inactive=#AAAAAA

## Navigation

Bottom tab bar with 5 sections:

| Tab | Icon | Route | Priority |
|-----|------|-------|----------|
| Расписание | Calendar | `/master` | Phase 1 |
| Статистика | Bar chart | `/master/stats` | Phase 2 |
| Финансы | Dollar circle | `/master/finance` | Phase 2 |
| Портфолио | Image | `/master/portfolio` | Phase 2 |
| Клиенты | People | `/master/clients` | Phase 2 |

## Phase 1: Schedule (MVP)

### Layout
- **Header:** Logo (left) + master avatar with initials (right)
- **Master card:** Name (Montserrat bold) + specialization (uppercase, wine-red, small) on light pink gradient background
- **Week selector:** ‹ / › navigation, "24 — 30 марта" label
- **Week days row:** 7 day pills, selected day = wine-red bg, dots indicate appointments
- **Day detail:** Appointment cards with time (start/end), service name, client name, chevron for details
- **Free slots:** Muted style, "Свободное окно" label

### Data Sources
- `workSlots` — master's confirmed work schedule
- `appointments` — bookings for this master
- `services` — service names and durations
- `masters` — master profile info

### API Endpoints (new)
- `GET /api/master/schedule?date=YYYY-MM-DD` — week schedule for authenticated master
- `GET /api/master/auth` — authenticate via Telegram initData, return master profile

## Phase 2: Additional Tabs (future)

- **Статистика:** Client count, appointment count, busiest days, trends
- **Финансы:** Revenue tracking, service breakdown, period comparison
- **Портфолио:** Upload work photos, displayed to clients during booking
- **Клиенты:** Regular clients, visit history, notes

## File Structure

```
app/(master)/
  master/
    layout.tsx          — light theme, Telegram WebApp init, tab bar
    page.tsx            — schedule (week view)
    stats/page.tsx      — statistics (Phase 2)
    finance/page.tsx    — finances (Phase 2)
    portfolio/page.tsx  — portfolio (Phase 2)
    clients/page.tsx    — client base (Phase 2)
components/master/
  MasterTabBar.tsx      — bottom navigation
  MasterHeader.tsx      — logo + avatar
  MasterWeekView.tsx    — week selector + day pills
  MasterDaySchedule.tsx — appointment cards for selected day
  MasterAuthGuard.tsx   — Telegram auth wrapper
```
