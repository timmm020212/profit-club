# Спецификация: Salon Admin — связка партнёрки и админки

> Дата: 2026-05-20
> Статус: одобрено пользователем, готово к плану реализации
> Скоуп: v1. Превращение legacy `/admin` в роль сотрудника салона под управлением партнёра.

---

## 1. Цель

Сегодня `/admin` — единая платформа без мульти‑тенанта. Любой админ видит данные **всех салонов**. Это и security‑дыра, и блокер запуска платных салонов.

Цель v1:

1. **Per‑salon admin аккаунты** — каждый салон владеет своими admin‑аккаунтами; админ видит **только** данные своего салона.
2. **Partner управляет admin‑аккаунтами** — новый раздел `/partner/administrator` с CRUD + 6 переключателями прав + кнопками «сбросить пароль» и «выгнать отовсюду».
3. **Удалить мёртвый код** — `/admin/analytics` и `/admin/services` (homepage сейчас редиректит, эти разделы не используются).
4. **Связать данные** — партнёрка и админка работают с одной БД, после scoping видят один и тот же набор данных (записи, смены, мастера, клиенты) в разных UI.

---

## 2. Модель данных

Новая таблица `salon_admins` в `db/schema-postgres.ts`:

```ts
export const salonAdmins = pgTable("salon_admins", {
  id: serial("id").primaryKey(),
  salonId: integer("salon_id").notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  rank: varchar("rank", { length: 20 }).notNull().default("secondary"), // "main" | "secondary"
  passwordHash: varchar("password_hash", { length: 200 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  forcePasswordReset: boolean("force_password_reset").notNull().default(false),
  sessionsInvalidatedAt: timestamp("sessions_invalidated_at"),
  lastLoginAt: timestamp("last_login_at"),
  telegramId: varchar("telegram_id", { length: 50 }),    // reserved for v2

  // Permissions — 6 toggles
  canEditSchedule:     boolean("can_edit_schedule").notNull().default(true),
  canEditBookings:     boolean("can_edit_bookings").notNull().default(true),
  canEditMasters:      boolean("can_edit_masters").notNull().default(false),
  canEditBotFlows:     boolean("can_edit_bot_flows").notNull().default(false),
  canRunOptimization:  boolean("can_run_optimization").notNull().default(false),
  canEditInventory:    boolean("can_edit_inventory").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  uniqueIndex("salon_admins_salon_username_idx").on(table.salonId, table.username),
]);

export type SalonAdmin = typeof salonAdmins.$inferSelect;
export type NewSalonAdmin = typeof salonAdmins.$inferInsert;
```

**Уникальность:** `(salonId, username)` — внутри одного салона имена уникальны; между салонами могут совпадать (что нормально: «ivan» в салоне A и «ivan» в салоне B — разные люди).

Существующая таблица `admins` **остаётся живой** для платформенных целей (модерация SaaS, поддержка). Не трогаем, не сливаем — это разные домены.

**Никакой миграции данных** — текущий единственный legacy‑admin (сам пользователь) пересоздаётся вручную как `salon_admin` своего первого салона через partner‑UI.

---

## 3. Авторизация

Логин в `/admin/login` остаётся, но `lib/auth.ts` провайдер `admin` переписывается:

```ts
authorize(credentials) {
  // 1. Try salon_admins first
  const username = String(credentials?.username || "");
  const password = String(credentials?.password || "");
  if (!username || !password) return null;

  const rl = rateLimit(`admin-login:${username}`, 5, 60 * 1000);
  if (!rl.ok) return null;

  // Try salon admin
  const [sa] = await db.select().from(salonAdmins)
    .where(eq(salonAdmins.username, username))
    .limit(1);
  if (sa) {
    if (!sa.isActive) return null;
    if (!await bcrypt.compare(password, sa.passwordHash)) return null;
    await db.update(salonAdmins)
      .set({ lastLoginAt: new Date() })
      .where(eq(salonAdmins.id, sa.id));
    return {
      id: sa.id.toString(),
      name: sa.name,
      role: "salonAdmin",
      salonId: sa.salonId,
      adminId: sa.id,
      // permissions snapshot in JWT for fast access:
      perms: {
        schedule: sa.canEditSchedule,
        bookings: sa.canEditBookings,
        masters:  sa.canEditMasters,
        bots:     sa.canEditBotFlows,
        optimize: sa.canRunOptimization,
        inventory:sa.canEditInventory,
      },
      forcePasswordReset: sa.forcePasswordReset,
      issuedAt: Math.floor(Date.now() / 1000),
    };
  }

  // 2. Fallback: platform admin (legacy)
  const [pa] = await db.select().from(admins)
    .where(eq(admins.username, username))
    .limit(1);
  if (pa && pa.isActive && await bcrypt.compare(password, pa.passwordHash)) {
    return { id: pa.id.toString(), name: pa.name, role: "admin" };
  }

  return null;
}
```

**JWT‑токен** для salon admin несёт `salonId`, `adminId`, `perms` snapshot, `issuedAt`.

**Permissions snapshot vs. live DB check:** хранение snapshot в JWT даёт мгновенный доступ для UI без DB‑запроса. **НО** проверка на API в защищённых маршрутах делает live‑lookup в `salon_admins`, чтобы партнёрский тоггл сразу же вступал в силу без перелогина админа. Snapshot в JWT — только UX-оптимизация для UI.

**Force password reset:**
- При входе если `forcePasswordReset = true` → возвращаем сессию с флагом, на клиенте middleware/page редиректит на `/admin/login/change-password` (новый screen).
- При успехе change-password: `passwordHash` обновляется, `forcePasswordReset = false`, `sessionsInvalidatedAt = now()` (все ранее выпущенные JWT-токены устаревают, текущая сессия перевыпускается через `signIn`).

**«Выгнать отовсюду»:**
- API: `POST /api/partner/salon-admins/[id]/kick` → `UPDATE salon_admins SET sessions_invalidated_at = now() WHERE id = X AND salon_id = ?`.
- Серверный helper `requireAdminSession()` сравнивает `token.issuedAt < admin.sessionsInvalidatedAt` → если да, 401 + клиент редиректит на `/admin/login`.

---

## 4. Permissions enforcement

Новый helper `lib/requireAdminSession.ts`:

```ts
export type AdminPermission =
  | "schedule" | "bookings" | "masters" | "bots" | "optimize" | "inventory";

export async function requireAdminSession(perm?: AdminPermission): Promise<
  { session: { salonId: number; adminId: number; perms: Record<AdminPermission, boolean>}; response: null } |
  { session: null; response: NextResponse }
> {
  const tok = await getServerSession(authOptions);
  if (!tok?.user || tok.user.role !== "salonAdmin" || !tok.user.salonId) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  // Live check: session not invalidated, account still active
  const [a] = await db.select().from(salonAdmins).where(eq(salonAdmins.id, tok.user.adminId));
  if (!a || !a.isActive) {
    return { session: null, response: NextResponse.json({ error: "Account disabled" }, { status: 401 }) };
  }
  if (a.sessionsInvalidatedAt && tok.user.issuedAt * 1000 < a.sessionsInvalidatedAt.getTime()) {
    return { session: null, response: NextResponse.json({ error: "Session revoked" }, { status: 401 }) };
  }
  const perms = {
    schedule: a.canEditSchedule,
    bookings: a.canEditBookings,
    masters:  a.canEditMasters,
    bots:     a.canEditBotFlows,
    optimize: a.canRunOptimization,
    inventory:a.canEditInventory,
  };
  if (perm && !perms[perm]) {
    return { session: null, response: NextResponse.json({ error: "Forbidden", missingPermission: perm }, { status: 403 }) };
  }
  return { session: { salonId: a.salonId, adminId: a.id, perms }, response: null };
}
```

**Применение в API:**
- Read‑эндпоинты: `requireAdminSession()` (без perm), потом `WHERE salonId = session.salonId`.
- Write‑эндпоинты в schedule: `requireAdminSession("schedule")`.
- Write в bookings: `requireAdminSession("bookings")`.
- И т.д. для остальных 4 областей.

**Применение в UI:**
- Серверная страница `/admin/page.tsx` уже под middleware. Дополнительно: загружает текущие perms (либо из NextAuth session, либо новым `GET /api/admin/me`) и передаёт в клиентские компоненты.
- Кнопки/инпуты редактирования получают prop `disabled` если соответствующий perm = false, плюс tooltip «Нет прав. Свяжитесь с владельцем салона».

---

## 5. Multi-tenant scope админки

Это **самая большая часть работы** в задаче. Все читающие/пишущие запросы под `/admin/*` сейчас не фильтруют по салону.

**Что надо отрефакторить:**

| Файл | Что фильтровать |
|---|---|
| `app/(app)/admin/page.tsx` | `appointments`, `masters`, `services`, `workSlots`, `scheduleBlocks` — всё фильтровать по `salonId = session.salonId` |
| `app/api/admin/optimize-schedule/{apply,send}/route.ts` | mastersList, slots |
| `app/api/admin/preliminary-confirm/route.ts` | appointment |
| `app/api/admin/schedule-block/route.ts` | блоки |
| `app/api/admin/invites/route.ts` | возможно удалить (инвайты к партнёру — отдельный домен) |
| `app/api/work-slots/route.ts` (если читается админкой) | по salonId |
| `app/api/work-slots-admin/route.ts` | по salonId |
| `app/api/work-slot-change-requests-admin/route.ts` | по salonId |
| `app/api/work-slots-stream/route.ts` (SSE) | по salonId |
| `app/api/admin/optimize-schedule/{apply,send}/route.ts` | по salonId |

**Подход:**
- Все запросы оборачиваются через `requireAdminSession` (с нужным `perm`).
- Каждый `db.select().from(X).where(...)` дополняется `eq(X.salonId, session.salonId)` (или `salonId`, если поле снэйк-кейс).
- Серверная страница `/admin/page.tsx` — в её серверной функции `getAdminDataForDate` добавить `session.salonId` параметр и фильтровать всё.

Это рискованная по масштабу часть. План должен разбить её на отдельные мелкие задачи (по 1-2 запроса).

---

## 6. Удаление мёртвого кода

Удалить:
- `app/(app)/admin/analytics/` — заглушка
- `app/(app)/admin/services/` — homepage services manager, homepage теперь редиректит
- `components/AdminSiteServicesManager.tsx`, `.tsx.backup` — мёртвая привязка к homepage
- Ссылки на эти разделы из `components/AdminHeader.tsx` (если есть)
- API endpoint `/api/upload`, `/api/uploads/services` (если используются только этим manager-ом) — проверить grep, оставить если ещё кто-то юзает

---

## 7. Партнёрский раздел `/partner/administrator`

### 7.1 Сайдбар

В `components/partner/PartnerShell.tsx` добавить пункт **«Администратор»** между «Тарифы» и «Профиль» — в массиве `accountNav`, иконка `gear` (или новая `userShield`).

### 7.2 Главная страница

`app/partner/administrator/page.tsx` — server wrapper, prefetch списка админов салона.
`app/partner/administrator/AdminsClient.tsx` — клиентский UI.

UI — list-row карточки в стиле `/partner/masters`:

```
┌────────────────────────────────────────────────────┐
│ ◯  Иван Петров           [главный]  [● активен]  → │
│ ИП  логин: ivan · последний вход 2 ч назад        │
│     ✓ Расписание ✓ Записи ✗ Боты ✗ Склад         │
└────────────────────────────────────────────────────┘
```

Сверху — кнопка `+ Добавить администратора`.

Empty state — «Добавьте первого администратора — он сможет работать в админке от имени вашего салона».

### 7.3 Модалка `AdminAccountEditor`

Создание / редактирование. Поля:

- **Имя** (отображаемое, например «Иван Петров»)
- **Логин (username)** — латиница/цифры/`_-`, validate на уникальность в пределах салона
- **Статус** (segment control: «Главный» / «Дополнительный»)
- **Пароль:**
  - В create: обязательное поле с валидацией ≥8 символов. Кнопка «сгенерировать» — рядом, выдаёт пароль, копируется в clipboard.
  - В edit: показывается отдельной секцией «Сбросить пароль» (см. ниже)
- **6 переключателей прав** в две колонки на ширине ≥480, в одну на мобилке:
  - Расписание · Записи · Мастера · Сценарии ботов · Авто-оптимизация · Склад/Рецепты

### 7.4 Edit‑mode дополнительные секции

Внизу модалки в режиме редактирования — отдельная зона действий:

- **Сбросить пароль** — раскрывается inline: textarea «Новый пароль» (или кнопка «сгенерировать»), кнопка «Сохранить и сбросить сессии». Подсказка: «При следующем входе админ должен будет сменить пароль».
- **Выгнать отовсюду** — кнопка с двойным кликом (подтверждение, как у «Отменить» в `AppointmentDetailModal`). Ставит `sessionsInvalidatedAt = now()`. Toast «Сессии админа сброшены».
- **Активировать / Деактивировать** — toggle для `isActive`. Деактивированный админ не может войти.
- **Удалить** (только если уже деактивирован) — soft delete `archivedAt`.

### 7.5 API под партнёра

| Метод | Путь | Назначение |
|---|---|---|
| `GET`    | `/api/partner/salon-admins` | Список (фильтр `archivedAt IS NULL` если не указан `?archived=1`) |
| `POST`   | `/api/partner/salon-admins` | Создать (username unique check, bcrypt пароля, force_password_reset=false по дефолту — партнёр сам задал) |
| `PATCH`  | `/api/partner/salon-admins/[id]` | Изменить имя/rank/perms/isActive |
| `DELETE` | `/api/partner/salon-admins/[id]` | Soft delete (только при isActive=false) |
| `POST`   | `/api/partner/salon-admins/[id]/reset-password` | Задать новый пароль (bcrypt), force_password_reset=true, sessions_invalidated_at=now |
| `POST`   | `/api/partner/salon-admins/[id]/kick` | sessions_invalidated_at=now (force re-login) |

Все эндпоинты — под `requirePartnerSession`, фильтр по `session.salonId`.

---

## 8. Связь партнёрки и админки

Данные **уже физически общие** (одна БД, таблицы `appointments`, `masters`, `services`, `workSlots`, `scheduleBlocks` и т.д.). После scoping (раздел 5) оба интерфейса видят один и тот же набор данных.

**UX‑связи:**

1. **Партнёр в `/partner/bookings` и админ в `/admin` видят те же записи** — просто в разных представлениях (list-row vs визуальный таймлайн).
2. **Изменение из любого UI мгновенно в обоих** (без специальной синхронизации — БД одна).
3. **Опционально (не делаем сейчас):** в карточке записи в партнёрке маленькая ссылка «Открыть в админ‑таймлайне» → ведёт на `/admin?date=YYYY-MM-DD`. Полезно если у партнёра есть и admin-аккаунт, иначе ссылка ведёт на login-страницу.

---

## 9. Сознательно не в v1

- Список устройств / именованные сессии (только «выгнать отовсюду»)
- 2FA для admin
- Audit log действий admin
- «Loginas» — партнёр временно влезает в admin под определённым админом
- Email‑восстановление пароля (только через partner)
- Granular permissions внутри одной области (например, «может видеть Записи но не может Удалять»)
- Telegram‑бот для admin (полу field есть, UI позже)
- «Заметки партнёра» к admin‑аккаунту
- Отчёт «кто что делал» по admin'у

---

## 10. Безопасность

- `passwordHash` — bcrypt cost 10 (как у партнёра).
- Rate-limit на `/admin/login` — 5 попыток / минуту / username, как у партнёра.
- `change-password` страница защищена сессией только этого админа.
- `requireAdminSession` всегда делает live‑lookup в БД для permission‑флагов и sessions_invalidated_at — JWT snapshot нельзя использовать как источник правды для access control.
- `salon_admins.username` лежит в БД как есть, без email‑верификации (партнёр под свою ответственность задаёт).
- Soft delete (`archivedAt`) для сохранения связи в логах. Hard delete не делаем — записи могли вестись под этим админом.

---

## 11. Чек-лист готовности v1

- [ ] Таблица `salon_admins` + индекс + типы
- [ ] `lib/auth.ts` admin provider: сначала salon_admins, потом fallback на admins
- [ ] `lib/requireAdminSession.ts` с perm‑параметром
- [ ] 6 partner API endpoints для управления admin аккаунтами
- [ ] `/partner/administrator` страница + `AdminAccountEditor` модалка
- [ ] Сайдбар: пункт «Администратор»
- [ ] Удалить `/admin/analytics`, `/admin/services` + `AdminSiteServicesManager*`
- [ ] Multi‑tenant scope для `/admin/page.tsx` и связанных API (~10 эндпоинтов)
- [ ] Кнопки в admin UI получают `disabled` по соответствующим perms
- [ ] `/admin/login/change-password` страница для force-reset flow
- [ ] BRIEF_FOR_GEMINI.md обновить (раздел «что уже реализовано» + закрыть gap «Роли/права»)

---

## 12. Технические соглашения

- Все суммы/времена — как в проекте: `getFullYear/getMonth/getDate`, никаких `toISOString().slice(0,10)`.
- DB import: `@/db/index-postgres`.
- Все запросы под partner и admin — через `requirePartnerSession` / `requireAdminSession` (новый).
- bcrypt cost 10.
- Permission‑флаги в JWT — только для UX (показать/скрыть кнопки); access control делает БД‑проверка на сервере.
- `salon_admins` миграция — через тот же путь, что и `reviews`/inventory (`db:push` падает с permission‑error → ручной SQL‑скрипт в `scripts/create-salon-admins.mjs`).
