# Брифинг проекта для Gemini

> Цель файла: ввести Gemini в курс дела по проекту, чтобы он мог провести аудит и
> выявить чего нам не хватает по сравнению с **Yclients** (yclients.com) — самая
> популярная CRM для салонов красоты в РФ/СНГ.
>
> Файл — **актуальное состояние на 2026-05-20**. Старые документы (`ИДЕЯ_ПРОЕКТА.md`,
> `ПЛАН_РАЗВИТИЯ.md`, `СПЕЦИФИКАЦИЯ.md`) описывают **прошлую** концепцию
> (single-salon CRM для одного салона в Ставрополе) и в большинстве своём
> неактуальны. Доверять — этому файлу.

---

## 1. Что это сейчас

**BeautyBook** (рабочее название; в коде ещё встречается старое имя `profit-club`)
— это **multi-tenant SaaS** для салонов красоты: прямой конкурент **Yclients**.

Платформа состоит из двух больших частей:

1. **Партнёрский кабинет** (`/partner/*`) — для владельцев салонов и админов.
   Управление салоном, мастерами, услугами, записями, клиентами, отзывами,
   расписанием, тарифами.
2. **Публичный сайт салона** (`/<slug>`) — лицо салона для клиентов.
   Витрина услуг, онлайн‑запись, регистрация через сайт или Telegram.

Дополнительно:
- Глобальный админ (`/admin`) — управляет платформой (модерация салонов, общий контент через Payload CMS).
- Мини‑приложение мастера (`/master`) — лёгкий веб‑интерфейс для мастера (его расписание, клиенты, портфолио). Доступ — по `staffPassword` или Telegram.

**Целевой пользователь:** русскоязычные салоны красоты (парикмахерские,
ногтевые студии, барбершопы, косметология, массаж).

**География:** Россия / СНГ (русский интерфейс, рубли, рос. часовые пояса).

---

## 2. Архитектура

### Стек

| Слой | Технология |
|---|---|
| Frontend | Next.js 15 App Router · TypeScript · Tailwind CSS · inline styles (BeautyBook design system) |
| Backend | Next.js API Routes (serverless on DockHost) |
| БД | PostgreSQL (Supabase managed) + Drizzle ORM |
| Auth | NextAuth v4 (JWT) — провайдеры `credentials` для admin и partner; клиенты — phone+Telegram |
| Storage | Supabase Storage (бакет `cms-media`) — медиа Payload + аватарки мастеров / фото услуг / филиалов |
| CMS | Payload v3 — для глобального контента сайта (hero, footer и т.п.) |
| Telegram | Telegraf (3 бота: клиентский, мастеров, админский). Сейчас **не в контейнере** — код в `telegram-bot/`, поднимем отдельным контейнером позже. |
| Деплой | DockHost (Docker) · `output: 'standalone'` · только Next.js в текущем контейнере |
| Хост | https://xjxk-ix55-pnf7.gw-1a.dockhost.net (домен ещё не привязан) |

### Multi‑tenant модель

- Каждый салон = строка в `salons` (slug, name, city, address, phone, logoUrl, tariff, isActive, inviteToken).
- Партнёр (владелец/админ салона) = строка в `partner_users` со ссылкой `salonId`.
- Почти все основные таблицы (`masters`, `services`, `serviceVariants`, `appointments`, `workSlots`, `pendingClients`, `botFlows`, `botSteps`) имеют колонку `salon_id` с дефолтом `1` (исторически — до multi-tenant).
- Изоляция данных партнёра — на уровне запросов: `where(eq(table.salonId, session.salonId))`. Это всегда фильтруется в `app/api/partner/**`.
- Сессия партнёра несёт `salonId`, `salonSlug`, `salonName` — см. `lib/auth.ts` и `lib/requirePartnerSession.ts`.

### Ключевые таблицы (`db/schema-postgres.ts`)

```
salons               — салон (тенант)
partner_users        — пользователи кабинета салона
admins               — глобальные администраторы платформы
masters              — мастера салона
services             — услуги салона
serviceVariants      — варианты услуги (разные длительность/цена)
appointments         — записи клиентов (snapshot имени/телефона на момент записи)
workSlots            — рабочие смены мастеров (createdAt + isConfirmed)
workSlotChangeRequests — запросы мастеров на изменение смены
scheduleBlocks       — перерывы / нерабочие интервалы в рамках смены
clients              — глобальная база клиентов (phone — ключ)
pendingClients       — клиенты до подтверждения телефона
telegramVerificationCodes — коды связки сайт ↔ Telegram
reviews              — отзывы клиентов (rating 1–5 + текст + ответ салона) — НОВАЯ, требует db:push
masterClientNotes    — приватные заметки мастера о клиенте
botFlows / botSteps / botButtons / botUserStates — конструктор бот-сценариев в админке
```

### Имена путей

- `/` — главная: редиректит на первый активный салон (или `/partner/join`).
- `/<slug>` — публичная страница салона (мульти‑тенант).
- `/partner/*` — кабинет партнёра (защищено middleware → роль `partner`).
- `/admin/*` — глобальный админ (защищено middleware → роль `admin`).
- `/master/*` — мини‑приложение мастера.
- `/cms/*` — Payload CMS.

---

## 3. Что уже реализовано

### Партнёрский кабинет (`/partner/*`)

| Раздел | Маршрут | Статус | Описание |
|---|---|---|---|
| Регистрация партнёра | `/partner/join` | ✅ | Open self-registration: email+пароль → создаётся салон + partnerUser; без инвайт‑токена. |
| Логин | `/partner/login` | ✅ | NextAuth `partner` провайдер; rate-limit 5/min на IP+email. |
| Главная (Dashboard) | `/partner/dashboard` | ✅ | Selector филиала, 3 KPI (записей/подтв./отменено), revenue с мини‑чартом, список «Сегодня». SSR‑prefetch салона чтобы не было FOUC. |
| Моя страница | `/partner/my-page` | ✅ | Превью публичной страницы салона + редактор. |
| Записи | `/partner/bookings` | ✅ | KPI · поиск · day‑strip с pagination по 5 (scroll-snap) · фильтр статусов · карточки. Клик → AppointmentDetailModal с отменой + переносом (PATCH /api/appointments/[id]). |
| Клиенты | `/partner/clients` | ✅ | Агрегатор из appointments по phone/name. Статусы лояльности: VIP / Постоянный / Новый / Спящий / Потерян. KPI · поиск (с нормализацией телефона) · фильтр · сортировка · детальная модалка с историей визитов, любимым мастером/услугой, контакт-кнопками. |
| Мастера | `/partner/masters` | ✅ | Компактный list-row (48px аватар, имя+роли+телефон), поиск, фильтр по специализации, редактор. |
| Услуги | `/partner/services` | ✅ | CRUD услуг + варианты (с CRUD UI в редакторе), per-variant рецепт материалов, загрузка фото в Supabase Storage. |
| Склад | `/partner/inventory` | ✅ | Каталог материалов · поступления (партии FIFO с ценой в копейках) · списания. Рецепт привязан к варианту услуги. Авто-предзаполнение списания при завершении записи. FIFO‑транзакция с SELECT FOR UPDATE. Обработка shortfall с баннером. Идемпотентность POST 409. |
| Расписание | `/partner/schedule` | ✅ (basic) | Grid редактор по дням, мастер × дата. |
| Отзывы | `/partner/reviews` | ✅ (UI готов, форма на сайте — нет) | Overview с распределением по звёздам, фильтры, ответы партнёра. Empty state с превью карточки. Schema готова. |
| Аналитика | `/partner/analytics` | ⏳ ComingSoon | Заглушка. |
| Тарифы | `/partner/tariff`, `/partner/billing` | ⏳ basic | Выбор тарифа есть, оплаты нет. |
| Профиль партнёра | `/partner/profile` | ⏳ basic | Заглушка. |

### Публичный сайт салона

| Что | Маршрут | Статус |
|---|---|---|
| Главная (редирект) | `/` | ✅ Берёт первый активный салон, редиректит на его страницу. |
| Страница салона | `/<slug>` | ✅ Хедер (logo, name, city, address, phone, description) + grid услуг. |
| Booking flow | внутри `<slug>` через `BookingModal` | ✅ Выбор услуги → варианта → даты → времени → подтверждение. |
| Регистрация клиента | сайт ↔ Telegram | ✅ Двусторонняя: site→pendingClients→Telegram кода, или Telegram→ссылка с tg_code. |
| Личный кабинет клиента | `/profile` | ⏳ Старая версия от Profit Club, не доработана под multi-tenant. |

### Мини‑приложение мастера (`/master/*`)

| Что | Статус |
|---|---|
| Логин по `staffPassword` или Telegram | ✅ |
| Главная (моя смена) | ✅ |
| Клиенты мастера (агрегатор + заметки) | ✅ |
| Финансы (зарплата по комиссии) | ✅ basic |
| Портфолио (фото работ) | ✅ |
| Статистика | ✅ basic |

### Глобальный админ + Payload CMS

| Что | Маршрут | Статус |
|---|---|---|
| Админ‑дашборд | `/admin` | ✅ (legacy от Profit Club: визуальный таймлайн по мастерам на день, авто‑оптимизация, change-requests) |
| Управление салонами | — | ❌ Нет UI; нужно делать. |
| Глобальный контент | `/cms/*` (Payload) | ✅ Hero, footer, marquee, zones, philosophy и т.п. — для «общесайтового» лендинга, который сейчас не показывается клиентам (главная редиректит). |
| Боты — конструктор сценариев | `/admin/bots` | ✅ Visual editor `botFlows/botSteps/botButtons`. |

### Telegram‑боты

| Бот | Файл | Назначение | В контейнере? |
|---|---|---|---|
| Клиентский | `telegram-bot/client-simple.ts` | Подтверждение телефона, напоминания, регистрация | Нет (в репо) |
| Мастеров | `telegram-bot/masters-bot-full.ts` | Подтверждение смен, уведомления о записях | Нет (в репо) |
| Админ | — | Уведомления админу | Нет |

Боты сейчас **не запущены в проде**. Код сохранён, поднимем отдельным
контейнером позже (см. план ниже).

### Уведомления / напоминания

- `app/api/cron/reminders` — крон-эндпоинт, шлёт за 1 час до записи (требует CRON_SECRET).
- `app/api/cron/master-morning` — утренняя сводка мастеру.
- `app/api/notifications/remind` — ручной триггер.
- При создании/отмене/переносе записи `app/api/appointments/[id]` шлёт сообщения мастеру и клиенту через Telegram Bot API напрямую (бот не нужен запущенным).

---

## 4. Design system (BeautyBook UI)

- **Палитра:** white `#FFFFFF`, soft `#F7F7FA`, border `#ECECF0`, primary violet `#7B61FF`, success `#1FB46A`, warn `#FF9500`, danger `#EF4444`, amber для рейтингов `#F59E0B`.
- **Шрифты:** Montserrat (UI) + Playfair Display (заголовки) + Inter (резерв). Через `var(--font-montserrat)`.
- **Layout shell:** `components/partner/PartnerShell.tsx` — sticky topbar (BB лого, приветствие, кнопка меню), drawer справа на 340px, контент max-width 960px центрирован.
- **Карточки:** белые с border `#ECECF0`, radius 14–20, тонкие тени, hover = subtle bg-soft + lift.
- **Дата-чипы:** 56×64, выбранный = фиолет с shadow.
- **Статусные пилюли:** одна цветовая палитра (orange/green/red) во всех модулях.
- **Mobile-first:** многие компоненты тестируются под 360px ширины внутри shell, scroll-snap для горизонтальных лент дат.
- **Глобальный фикс:** инпуты на мобиле принудительно `font-size: 16px` (`app/globals.css`) — чтобы iOS не зумил при тапе.

---

## 5. Что в ближайших планах

### Срочное

1. **Привязать домен** к DockHost (сейчас на технической URL).
2. **`db:push`** на проде, чтобы создалась таблица `reviews`.
3. **Форма отзыва на сайте** — после завершённой записи клиент получает ссылку/кнопку «Оставить отзыв», ставит 1–5 звёзд и пишет текст. Schema готова, UI на сайте нужен.

### Среднесрочно (v2)

- Раздел **«Аналитика»** в кабинете партнёра: выручка по периодам, ТОП‑услуги, загрузка мастеров, конверсия, churn rate клиентов.
- **Визуальный timeline записей** в кабинете партнёра (в глобальном админе он уже есть — нужно адаптировать).
- **Drag‑and‑drop переноса записей** в timeline.
- **Уведомления партнёру** в кабинете (бэйджи на нав‑айтемах: новые отзывы, неподтверждённые записи).
- **Push‑уведомления** через Web Push API.
- **SMS‑интеграция** (SMS.RU / Twilio) — для клиентов без Telegram.
- **WhatsApp Cloud API** — для регионов где WhatsApp ≫ Telegram.

### Долгосрочно

- **Онлайн‑оплата** (ЮKassa / CloudPayments / Stripe для intl) — депозит при онлайн‑записи, чтобы снизить no-show.
- **54‑ФЗ онлайн‑касса** (АТОЛ Онлайн, Эвотор) — для России обязательно.
- **Лояльность:** бонусные карты, абонементы, подарочные сертификаты.
- **Зарплаты / финансы:** учёт комиссии мастера, оклад, расход на материалы, P&L по салону.
- **Товары на продажу** (отдельно от расходных материалов — материалы уже сделаны в v1).
- **Multi‑branch:** один партнёр — несколько филиалов (schema уже намекает: `salonId` на всём).
- **Роли:** не только partner+admin, но и manager, accountant, master с разными правами.
- **Виджет онлайн‑записи** для встраивания на сторонние сайты (iframe).
- **API для интеграций** (открытый REST с токеном).
- **iOS / Android приложение для клиента** (или хотя бы PWA с install-prompt).
- **White-label**: salon.example.com → салон выбирает свой домен.

---

## 6. Где мы относительно Yclients

> Этот раздел — **главный для Gemini**: помоги дополнить, проверить, найти gaps.

### Что у нас уже есть (паритет с Yclients)

- ✅ Multi-tenant изоляция по салонам
- ✅ Онлайн‑запись через сайт
- ✅ Управление мастерами / услугами / расписанием
- ✅ Карточка клиента с историей визитов
- ✅ Сегментация клиентов по лояльности (VIP / Постоянный / Новый / Спящий / Потерян)
- ✅ Уведомления через Telegram (мастеру + клиенту) при создании/отмене/переносе
- ✅ Напоминания за 1 час до записи
- ✅ Мини‑приложение для мастера
- ✅ Перенос / отмена записи из кабинета
- ✅ Категории услуг + варианты услуги (разные длительность/цена)
- ✅ Подтверждение смен мастером через Telegram
- ✅ Складской учёт расходных материалов (партии FIFO + per-variant рецепт + авто-списание при завершении записи)
- ✅ Завершение записи мастером (через partner-кабинет; через мини-приложение мастера — в v2)

### Что у нас уже частично

- 🟡 **Отзывы** — schema + UI кабинета готовы, нет формы на сайте клиента
- 🟡 **Расписание** — есть, но не визуальный timeline в кабинете партнёра
- 🟡 **Аналитика** — заглушка
- 🟡 **Multi‑branch** — schema готова (`salonId` колонки), но UI как будто один филиал
- 🟡 **Тарифы** — выбор есть, биллинг/оплата нет

### Чего нет (предполагаемые gaps vs Yclients) — Gemini, проверь!

- ❌ Зарплаты мастеров / расчёт комиссии в кабинете партнёра
- ❌ Касса / финансы / 54‑ФЗ
- ❌ Товары на продажу (отдельно от расходных материалов)
- ❌ Бонусные программы / абонементы / сертификаты
- ❌ Онлайн‑оплата при записи
- ❌ SMS / WhatsApp интеграции
- ❌ Email маркетинг и рассылки
- ❌ Сегментные рассылки клиентам (например «спящим — скидка 20%»)
- ❌ Drag-n-drop переноса записей в timeline
- ❌ Перетягивание услуг между мастерами
- ❌ Группы услуг / абонементов
- ❌ Скидки / акции / промокоды
- ❌ Возможность мастеру отметить «выполнено» / «no-show»
- ❌ Чек‑лист до/после визита (что предложить, что напомнить)
- ❌ Журнал звонков
- ❌ Импорт клиентов из Excel
- ❌ Экспорт в iCal / Google Calendar
- ❌ Виджет онлайн‑записи (iframe для сайтов салонов)
- ❌ Мобильное приложение клиента (есть Telegram WebApp, но не native)
- ❌ White-label custom domain
- ❌ API для интеграций
- ❌ Шаблоны автоматизаций (триггер → действие, like Zapier)
- ❌ Отчёты PDF/Excel
- ❌ A/B тесты публичной страницы салона
- ❌ Конструктор лендинга салона (сейчас фикс. layout)
- ❌ Multi-language (только русский)
- ❌ Multi-currency (только рубли)
- ❌ Учёт нескольких часовых поясов
- ❌ GDPR / 152-ФЗ персональные данные — согласия, политики
- ❌ Двухфакторная аутентификация
- ❌ Журнал аудита действий партнёра

---

## 7. Технические нюансы / правила (важные для Gemini)

Эти правила уже встроены в код:

- **Импорт БД в Next.js:** `import { db } from "@/db"` (реэкспорт из `db/index-postgres.ts`).
- **Импорт БД в ботах:** `import { db } from "../db/index-postgres"`.
- **Даты:** всегда `getFullYear/getMonth/getDate`. **Никогда** `toISOString().slice(0,10)` — timezone bug.
- **TZ:** `todayIso` для серверных компонентов вычисляется на сервере и пробрасывается пропом клиенту, чтобы избежать hydration mismatch.
- **Загрузки:** только Supabase Storage через `lib/uploadAsset.ts`. Локальный диск — только dev fallback.
- **DB retry:** Supabase pooler агрессивно убивает idle‑соединения. Все критичные запросы обёрнуты в `dbRetry()` (`db/index-postgres.ts`) с exponential backoff.
- **Auth:** партнёр через `signIn("partner", ...)`. Старый JWT‑путь `partner-auth.ts` — legacy, не используется UI.
- **iOS zoom fix:** все input/textarea/select имеют `font-size: 16px !important` на мобиле (`app/globals.css`).
- **Bookings list cap:** SSR‑prefetch 200 записей в `/partner/bookings`, 500 в `/partner/clients`. Для бОльших салонов нужна пагинация (TODO).
- **Reviews table:** добавлена в schema, но **может ещё не существовать в проде** до `db:push`. API/page обрабатывают «relation does not exist» как пустой список.

---

## 8. Структура файлов (быстрая навигация)

```
app/
  (app)/                     — публичный сайт (route group)
    [slug]/page.tsx          — публичная страница салона
    page.tsx                 — главная (редирект)
    layout.tsx               — wrapper с провайдерами
  (master)/master/           — мини-приложение мастера
  (payload)/                 — Payload CMS routes
  partner/                   — кабинет партнёра
    layout.tsx               — auth check + PartnerShell wrapper
    page.tsx                 — / → /partner/dashboard
    dashboard/{page,DashboardClient}.tsx
    bookings/{page,BookingsClient}.tsx
    clients/{page,ClientsClient}.tsx
    masters/page.tsx
    services/page.tsx
    schedule/page.tsx
    reviews/{page,ReviewsClient}.tsx
    my-page/page.tsx
    profile/page.tsx
    analytics/page.tsx       — ComingSoon
    billing/page.tsx
    tariff/page.tsx
    join/page.tsx            — регистрация
    login/page.tsx
  admin/                     — глобальный админ (legacy)
  api/
    partner/                 — кабинет партнёра API (требуют partner session)
    appointments/            — общие CRUD записей
    clients/                 — регистрация / телеграм клиентов
    master/                  — API мини-приложения мастера
    work-slots/, work-slot-change-requests/
    cron/                    — крон-эндпоинты (CRON_SECRET)
    notifications/

components/
  partner/                   — компоненты кабинета
    PartnerShell.tsx         — sidebar + topbar
    AppointmentDetailModal.tsx — детали записи + перенос/отмена
    ClientDetailModal.tsx    — карточка клиента
    BranchEditor.tsx, MasterEditor.tsx, ServiceEditor.tsx, ScheduleCellEditor.tsx
    ComingSoon.tsx
  BookingModal.tsx, BookingServicesGrid.tsx, ServiceGrid.tsx — публичная запись

db/
  schema-postgres.ts         — единая схема (Drizzle)
  index-postgres.ts          — pool + dbRetry helper

lib/
  auth.ts                    — NextAuth config (admin + partner провайдеры)
  requirePartnerSession.ts   — guard для API роутов
  uploadAsset.ts             — общая загрузка в Supabase Storage
  supabase-storage.ts        — низкоуровневый клиент
  rate-limit.ts              — in-memory rate limit
  payload-client.ts          — fetch helper для Payload globals

telegram-bot/                — код ботов (в репо, не в контейнере)
collections/, globals/       — Payload CMS определения

middleware.ts                — auth guard (admin/partner/api)
next.config.mjs              — standalone output + image config
Dockerfile                   — minimal Next.js standalone (без ботов)
```

---

## 9. Что я хочу от Gemini

1. **Аудит gaps vs Yclients** — заполни/уточни список «Чего нет» в разделе 6.
   Что я мог упустить из того что реально критично для запуска платных салонов?
2. **Приоритезация** — какие 5–10 фич из списка GAP закроют 80% типичных
   потребностей салона и должны идти первыми?
3. **Архитектурные предупреждения** — что в текущей структуре нас укусит при
   масштабе (10+ салонов, 1000+ записей в месяц у каждого)?
4. **Безопасность / соответствие** — что обязательно для российского рынка
   (152-ФЗ, 54-ФЗ, маркировка, оферта), и как мы стоим сейчас?
5. **UX‑дыры** — какие пользовательские сценарии вообще «не закрыты»
   маршрутами/UI (например клиент хочет вернуть деньги, мастер заболел, и т.д.)?

Спасибо.
