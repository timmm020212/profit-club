# 🚀 **Команды для запуска проекта (Исправленные)**

## ⚠️ **Проблема:** npm не в PATH, используем полные пути

## 📋 **Полный запуск всех сервисов**

### **1. Запуск базы данных PostgreSQL**
```bash
# Windows:
net start postgresql-x64-15
```

### **2. Запуск основного сайта (Next.js)**
```bash
# Откройте терминал в папке проекта
cd "c:/Users/timur/Downloads/Profit Club"

# Запуск сайта с полным путем к node
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' node_modules/npm/bin/npm-cli.js run dev"

# Или через npx:
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' npx next dev"

# Сайт будет доступен по адресу: http://localhost:3000
# Админ-панель: http://localhost:3000/admin
```

### **3. Запуск Telegram ботов**

#### **Мастерский бот (для мастеров)**
```bash
# Откройте НОВЫЙ терминал в папке проекта
cd "c:/Users/timur/Downloads/Profit Club"

# Запуск мастерского бота
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' node_modules/npm/bin/npm-cli.js run masters-bot"

# Или напрямую:
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' telegram-bot/masters-bot.ts"

# Бот будет доступен в Telegram: @ProfitClub_staff_bot
```

#### **Клиентский бот (для клиентов)**
```bash
# Откройте ТРЕТИЙ терминал в папке проекта
cd "c:/Users/timur/Downloads/Profit Club"

# Запуск клиентского бота
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' node_modules/npm/bin/npm-cli.js run client-bot"

# Или напрямую:
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' telegram-bot/client-bot.ts"

# Бот будет доступен в Telegram: @ProfitClub_club_bot
```

## 🔄 **Порядок запуска**

### **✅ Правильная последовательность:**

1. **База данных** - запустить первой
2. **Основной сайт** - запустить вторым
3. **Telegram боты** - запустить последними

```bash
# Терминал 1: База данных
net start postgresql-x64-15

# Терминал 2: Основной сайт
cd "c:/Users/timur/Downloads/Profit Club"
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' npx next dev"

# Терминал 3: Мастерский бот
cd "c:/Users/timur/Downloads/Profit Club"
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' telegram-bot/masters-bot.ts"

# Терминал 4: Клиентский бот
cd "c:/Users/timur/Downloads/Profit Club"
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' telegram-bot/client-bot.ts"
```

## 🌐 **Адреса после запуска**

### **Веб-интерфейсы:**
- **Основной сайт**: http://localhost:3000
- **Админ-панель**: http://localhost:3000/admin
- **API эндпоинты**: http://localhost:3000/api/*

### **Telegram боты:**
- **Мастерский бот**: @ProfitClub_staff_bot
- **Клиентский бот**: @ProfitClub_club_bot

## 🔧 **Альтернативные способы запуска**

### **Способ 1: Через tsx (рекомендуется)**
```bash
# Установка tsx если не установлено
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' node_modules/npm/bin/npm-cli.js install -g tsx"

# Запуск сайта
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' npx tsx server.ts"

# Запуск ботов
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' npx tsx telegram-bot/masters-bot.ts"
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' npx tsx telegram-bot/client-bot.ts"
```

### **Способ 2: Через package.json скрипты**
```bash
# Запуск сайта
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' node_modules/.bin/next dev"

# Запуск ботов
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' node_modules/.bin/tsx telegram-bot/masters-bot.ts"
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' node_modules/.bin/tsx telegram-bot/client-bot.ts"
```

## ⚠️ **Важные замечания**

### **Перед запуском убедитесь:**
1. **PostgreSQL установлен и запущен**
2. **Файл `.env.local` существует с правильными токенами**
3. **Все зависимости установлены**

### **Установка зависимостей:**
```bash
cd "c:/Users/timur/Downloads/Profit Club"
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' node_modules/npm/bin/npm-cli.js install"
```

## 🎯 **Самый простой способ (копируйте и вставьте):**

```bash
# 1. Запуск базы данных
net start postgresql-x64-15

# 2. Запуск сайта (в новом терминале)
cd "c:/Users/timur/Downloads/Profit Club"
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' npx next dev"

# 3. Запуск мастерского бота (в новом терминале)
cd "c:/Users/timur/Downloads/Profit Club"
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' npx tsx telegram-bot/masters-bot.ts"

# 4. Запуск клиентского бота (в новом терминале)
cd "c:/Users/timur/Downloads/Profit Club"
powershell -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' npx tsx telegram-bot/client-bot.ts"
```

**Теперь все команды должны работать с полными путями к Node.js!** 🎉
