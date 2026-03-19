# Client Auth & Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unified client auth (phone+password & Telegram deep link), profile page with appointments management, favorite masters, booking history.

**Architecture:** Client auth via localStorage (no NextAuth — that's admin-only). Login page with two methods. Profile page with 4 sections. Reuse existing BookingModal for rebooking/rescheduling. All data from existing `clients`, `appointments`, `services`, `masters` tables.

**Tech Stack:** Next.js 15 App Router, Tailwind, Drizzle ORM, bcrypt, Telegraf

**Spec:** `docs/superpowers/specs/2026-03-19-client-auth-profile-design.md`

---

## File Structure

```
app/login/page.tsx                              — CREATE: login page (phone+password & telegram)
app/profile/page.tsx                            — CREATE: profile page wrapper (auth check + layout)
components/LoginForm.tsx                        — CREATE: phone+password form + telegram deep link
components/ClientProfileCard.tsx                — CREATE: client info card with edit
components/ClientAppointments.tsx               — CREATE: upcoming appointments with cancel/reschedule/rebook
components/ClientFavoriteMasters.tsx             — CREATE: masters from history, book button
components/ClientHistory.tsx                    — CREATE: past/cancelled appointments, rebook
app/api/clients/login/route.ts                  — MODIFY: add POST handler for phone+password login
app/api/clients/telegram-login-code/route.ts    — CREATE: generate LOGIN_ code for telegram auth
app/api/clients/appointments/route.ts           — CREATE: GET client appointments with filters
telegram-bot/client-simple.ts                   — MODIFY: handle LOGIN_ prefix in /start
components/Header.tsx                           — MODIFY: link to /profile when logged in
```

---

### Task 1: Login API endpoints

**Files:**
- Modify: `app/api/clients/login/route.ts`
- Create: `app/api/clients/telegram-login-code/route.ts`

- [ ] **Step 1: Add POST to login route — phone + password auth**

POST `/api/clients/login` receives `{ phone, password }`. Finds client by phone in `clients` table. Compares password with bcrypt. Returns client data (id, name, phone, telegramId) or 401.

- [ ] **Step 2: Create telegram-login-code route**

POST `/api/clients/telegram-login-code` generates `LOGIN_<8-hex-code>`, saves to `telegramVerificationCodes` with 10 min expiry, returns `{ code, botUrl: "t.me/<botUsername>?start=LOGIN_<code>" }`.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(api): client login endpoints — phone+password and telegram code"
```

---

### Task 2: Bot handles LOGIN_ prefix

**Files:**
- Modify: `telegram-bot/client-simple.ts`

- [ ] **Step 1: In /start handler, detect LOGIN_ prefix**

In the existing `/start` handler, before the pendingClients check, add:

```typescript
if (startPayload && startPayload.startsWith('LOGIN_')) {
  const code = startPayload;
  // Find code in telegramVerificationCodes
  // Find client by telegramId
  // Mark code as used, link telegramId if needed
  // Reply "✅ Вход на сайт подтверждён!"
  return;
}
```

The site polls `verify-status` which already checks `telegramVerificationCodes` — just need to mark the code as used and ensure client's telegramId is set.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(bot): handle LOGIN_ prefix for site authentication"
```

---

### Task 3: Client appointments API

**Files:**
- Create: `app/api/clients/appointments/route.ts`

- [ ] **Step 1: Create GET endpoint**

`GET /api/clients/appointments?clientId=<id>&status=confirmed&future=true`

Query appointments joined with services and masters. Filter by:
- `clientId` (required) — match by client's phone or telegramId in appointments table
- `status` (optional) — "confirmed", "cancelled", or "all"
- `future` (optional) — if "true", only appointmentDate >= today

Return array with: id, serviceName, servicePrice, serviceDuration, masterName, masterPhoto, masterSpecialization, appointmentDate, startTime, endTime, status.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(api): client appointments endpoint with filters"
```

---

### Task 4: Login page

**Files:**
- Create: `app/login/page.tsx`
- Create: `components/LoginForm.tsx`

- [ ] **Step 1: Create LoginForm component**

"use client" component. Dark theme (bg-[#09090D]). Two sections:

Top: Phone + password form. Phone input with +7 mask, password input, "Войти" button. Error display. On success: save to localStorage, redirect to /profile.

Bottom: "Войти через Telegram" section. Button triggers POST to `/api/clients/telegram-login-code`. Shows link button to `t.me/bot?start=LOGIN_code`. Polls verify-status every 2 seconds. On verified: save to localStorage, redirect.

Style: dark cards, accent color #B2223C for primary buttons, font-montserrat, rounded-xl inputs. Same aesthetic as booking page.

- [ ] **Step 2: Create login page wrapper**

`app/login/page.tsx` — server component that renders Header + LoginForm. If already logged in (check on client side), redirect to /profile.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: login page with phone+password and telegram deep link"
```

---

### Task 5: Profile page layout

**Files:**
- Create: `app/profile/page.tsx`

- [ ] **Step 1: Create profile page**

"use client" page. Auth guard: if not logged in → redirect to `/login`.

Layout:
- Header (existing)
- ClientProfileCard
- ClientAppointments (upcoming)
- ClientFavoriteMasters
- ClientHistory

Load client data from localStorage (id, name, phone, telegramId). Pass as props.

Dark theme `bg-[#09090D]`, max-w-4xl centered, padding.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: profile page layout with auth guard"
```

---

### Task 6: Client profile card

**Files:**
- Create: `components/ClientProfileCard.tsx`

- [ ] **Step 1: Create component**

Shows: avatar circle with initials (accent gradient), name, phone, telegram status badge (green "Привязан" / gray "Не привязан"), edit button.

Edit mode: inline input for name. Save via `PATCH /api/clients/update` (or just update localStorage + call an API to update name in DB).

Style: dark card with subtle border, rounded-2xl, consistent with admin design.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: client profile card component"
```

---

### Task 7: Client appointments component

**Files:**
- Create: `components/ClientAppointments.tsx`

- [ ] **Step 1: Create component**

Fetches `GET /api/clients/appointments?clientId=X&status=confirmed&future=true`.

Each appointment card:
- Service name, master name, date (formatted), time, price
- "Перенести" button → opens BookingModal with service+master preset, rescheduleFromId
- "Отменить" button → confirmation modal → PATCH cancel → refetch
- "Записаться снова" button → opens BookingModal with service+master preset (no reschedule)

Cancel check: compute hours until appointment, block if ≤ 2 hours.

Empty state: "Нет предстоящих записей" + "Записаться" link to /booking.

Style: cards with dark bg, dashed border separators, accent buttons.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: client appointments component with cancel/reschedule/rebook"
```

---

### Task 8: Favorite masters component

**Files:**
- Create: `components/ClientFavoriteMasters.tsx`

- [ ] **Step 1: Create component**

Fetches all client appointments, extracts unique masters (by masterId). For each master: fetch master data (name, specialization, photoUrl).

Card: photo or initials, name, specialization, "Записаться" button → links to `/booking` or opens BookingModal filtered by this master.

Horizontal scroll on mobile, grid on desktop.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: favorite masters component"
```

---

### Task 9: History component

**Files:**
- Create: `components/ClientHistory.tsx`

- [ ] **Step 1: Create component**

Fetches `GET /api/clients/appointments?clientId=X&status=all&future=false`.

Compact list: date, service, master, status badge (confirmed=green, cancelled=red). "Записаться снова" button on each.

Collapsible — show last 5, "Показать все" expander.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: appointment history component with rebook"
```

---

### Task 10: Header integration

**Files:**
- Modify: `components/Header.tsx`

- [ ] **Step 1: Update auth button**

When logged in (`profit_club_user_registered === "verified"`):
- Show user name + link to `/profile` instead of "Войти"
- Logout: clear localStorage, dispatch auth event

When not logged in:
- "Войти" button → navigate to `/login` (instead of opening registration modal)

Keep registration modal accessible from `/login` page.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: header links to profile/login based on auth state"
```

---

### Task 11: Test and push

- [ ] **Step 1: Start dev server and test login flow**

Test phone+password login, telegram deep link, profile page loads, appointments display.

- [ ] **Step 2: Test cancel/reschedule/rebook**

Cancel an appointment, reschedule one, rebook from history.

- [ ] **Step 3: Final commit and push**

```bash
git add -A
git commit -m "feat: client auth & profile complete"
git push origin main
```
