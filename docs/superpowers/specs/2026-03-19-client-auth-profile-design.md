# Client Auth & Profile

## Overview

Единая авторизация клиента между ботом и сайтом. Профиль клиента с управлением записями, избранными мастерами, повторной записью.

## 1. Авторизация

### Страница `/login`

Два способа входа:

**Телефон + пароль:**
- Форма: телефон (маска +7), пароль
- `POST /api/clients/login` — проверяет phone + bcrypt password → возвращает client data
- Сохраняет в localStorage: `profit_club_client_id`, `profit_club_client_phone`, `profit_club_user_name`, `profit_club_user_registered: "verified"`, `profit_club_telegram_id`
- Редирект на `/profile`

**Войти через Telegram (deep link):**
- Кнопка генерирует `LOGIN_<8-hex-code>` → `POST /api/clients/telegram-login-code` сохраняет в `telegramVerificationCodes`
- Показывает ссылку `t.me/<botUsername>?start=LOGIN_<code>`
- Сайт поллит `GET /api/clients/verify-status?code=<code>` каждые 2 секунды
- Бот: `/start LOGIN_xxx` → находит клиента по telegramId → помечает код isUsed=true, привязывает telegramId
- Сайт видит verified → сохраняет сессию → редирект `/profile`

### Сессия

localStorage (без NextAuth, который только для админов). Header уже читает эти ключи.

### Регистрация

Существующая модалка регистрации (RegistrationModal) — ссылка с `/login`.

## 2. Профиль `/profile`

### Защита

Если `profit_club_user_registered !== "verified"` — редирект на `/login`.

### Layout

Тёмная тема `bg-[#09090D]`. Header сверху (уже есть).

### Карточка клиента (верх)

- Аватарка (инициалы если нет фото)
- Имя, телефон
- Статус Telegram (привязан/не привязан)
- Кнопка "Редактировать" → инлайн редактирование имени

### Секция "Предстоящие записи"

Запрос: `GET /api/appointments?clientPhone=<phone>&status=confirmed&future=true`

Каждая запись — карточка:
- Услуга, мастер, дата, время, цена
- Кнопки: "Перенести", "Отменить", "Записаться снова"

Если записей нет: "Нет предстоящих записей" + кнопка "Записаться"

### Секция "Мои мастера"

Уникальные мастера из истории записей клиента. Карточки: фото/инициалы, имя, специализация, кнопка "Записаться".

### Секция "История записей"

Прошлые и отменённые записи. Компактный список. Кнопка "Записаться снова" у каждой.

## 3. Управление записями

### Отмена

Кнопка "Отменить" → модалка подтверждения.
- Проверка: до записи > 2 часов
- `PATCH /api/appointments/<id>` → status: "cancelled"
- Уведомление мастеру (через существующую логику в API)

### Перенос

Кнопка "Перенести" → BookingModal с предвыбранной услугой + мастером (начало с выбора даты).
- Проверка: до записи > 2 часов
- После подтверждения: старая отменяется, новая создаётся

### Записаться снова

Кнопка у прошлых записей и у мастеров. Открывает BookingModal с предвыбранной услугой/мастером.

## 4. API изменения

### Новые эндпоинты

- `POST /api/clients/login` — вход по телефону + паролю
- `POST /api/clients/telegram-login-code` — генерация кода для Telegram входа

### Модификации существующих

- `GET /api/appointments` — добавить query params: `clientPhone`, `status`, `future` (фильтр по дате)
- `PATCH /api/appointments/<id>` — добавить отмену клиентом (проверка 2ч)

### Бот клиента

- Обработка `/start LOGIN_xxx` — уже есть инфраструктура для кодов, добавить распознавание префикса `LOGIN_`

## 5. Файлы

### Новые
- `app/login/page.tsx` — страница входа
- `app/profile/page.tsx` — профиль клиента
- `components/ClientProfileCard.tsx` — карточка клиента
- `components/ClientAppointments.tsx` — предстоящие записи с управлением
- `components/ClientFavoriteMasters.tsx` — мои мастера
- `components/ClientHistory.tsx` — история записей
- `app/api/clients/login/route.ts` — MODIFY: добавить POST для входа
- `app/api/clients/telegram-login-code/route.ts` — CREATE: генерация login кода

### Модификации
- `app/api/appointments/route.ts` — добавить GET с фильтрами клиента
- `telegram-bot/client-simple.ts` — обработка LOGIN_ префикса в /start
- `components/Header.tsx` — ссылка на /profile вместо модалки
