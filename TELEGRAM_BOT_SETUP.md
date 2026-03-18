# 🤖 Настройка Telegram ботов для Profit Club

## ✅ Что уже готово:

1. **База данных PostgreSQL** - работает
2. **Администраторы** - 4 пользователя с Telegram ID
3. **Мастера** - 3 специалиста готовы к работе
4. **Код ботов** - создан и готов к запуску

## 🔧 Что нужно сделать:

### 1. Создать Telegram бота

1. Откройте Telegram и найдите **@BotFather**
2. Отправьте команду `/newbot`
3. Введите имя бота: `Profit Club Admin Bot`
4. Введите username бота: `profit_club_admin_bot` (или другой уникальный)
5. **Скопируйте токен** - он выглядит так: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

### 2. Создать бота для мастеров (опционально)

1. Отправьте @BotFather команду `/newbot`
2. Имя: `Profit Club Masters Bot`
3. Username: `profit_club_masters_bot`
4. **Скопируйте токен**

### 3. Настроить переменные окружения

Откройте файл `.env.local` и добавьте:

```env
# Токен админского бота
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Токен бота для мастеров (если создали)
MASTERS_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Telegram ID администратора (узнайте свой ID у @userinfobot)
ADMIN_TELEGRAM_ID=123456789
```

### 4. Узнать свой Telegram ID

1. Найдите в Telegram бота **@userinfobot**
2. Отправьте ему `/start`
3. Он покажет ваш ID (например: `123456789`)
4. Обновите этот ID в `.env.local` и в базе данных

### 5. Обновить Telegram ID в базе данных

Запустите скрипт с вашими реальными ID:

```bash
npm run add-admin-telegram-ids
```

Или вручную обновите в базе данных:

```sql
UPDATE admins SET telegram_id = 'ВАШ_REAL_TELEGRAM_ID' WHERE username = 'admin';
UPDATE admins SET telegram_id = 'ВАШ_REAL_TELEGRAM_ID' WHERE username = 'natalia';
UPDATE admins SET telegram_id = 'ВАШ_REAL_TELEGRAM_ID' WHERE username = 'anna';
UPDATE admins SET telegram_id = 'ВАШ_REAL_TELEGRAM_ID' WHERE username = 'anastasia';
```

## 🚀 Запуск ботов

### Админский бот:

```bash
npm run bot:start
```

### Бот для мастеров:

```bash
npm run bot:masters
```

## 📋 Функционал ботов

### Админский бот:
- 📋 Просмотр списка мастеров
- ➕ Добавление рабочего времени
- 📅 Просмотр расписания
- 🔧 Управление записями

### Бот для мастеров:
- 📅 Просмотр своего расписания
- ✅ Подтверждение записей
- 📝 Управление рабочим временем
- 🔔 Уведомления о новых записях

## 🔄 Тестирование

1. **Запустите бота** с реальным токеном
2. **Найдите бота** в Telegram по username
3. **Отправьте `/start`**
4. **Проверьте доступ** - должен сработать для администраторов

## 🛠️ Команды для разработки

```bash
# Запуск админского бота
npm run bot:start

# Запуск бота для мастеров  
npm run bot:masters

# Добавление Telegram ID администраторам
npm run add-admin-telegram-ids

# Просмотр базы данных
npm run db:studio
```

## ⚠️ Важные замечания

1. **Токен бота** - секретный, не делитесь им
2. **Telegram ID** - уникальный для каждого пользователя
3. **Боты работают** только с реальными токенами
4. **База данных** должна быть доступна для ботов

## 🆘 Поддержка

Если бот не запускается:
1. Проверьте токен в `.env.local`
2. Убедитесь, что PostgreSQL работает
3. Проверьте ваш Telegram ID в базе данных
4. Убедитесь, что у вас есть права администратора

---

**Готово к настройке!** 🎉
