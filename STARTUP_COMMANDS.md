# 🚀 **Команды для запуска проекта**

## 📋 **Полный запуск всех сервисов**

### **1. Запуск базы данных PostgreSQL**
```bash
# Запуск PostgreSQL (если не запущена)
# Windows:
net start postgresql-x64-15

# Или через Docker (если используется):
docker start postgres_container
```

### **2. Запуск основного сайта (Next.js)**
```bash
# Откройте терминал в папке проекта
cd "c:/Users/timur/Downloads/Profit Club"

# Установка зависимостей (если нужно)
npm install

# Запуск сайта в режиме разработки
npm run dev

# Сайт будет доступен по адресу: http://localhost:3000
# Админ-панель: http://localhost:3000/admin
```

### **3. Запуск Telegram ботов**

#### **Мастерский бот (для мастеров)**
```bash
# Откройте НОВЫЙ терминал в папке проекта
cd "c:/Users/timur/Downloads/Profit Club"

# Запуск мастерского бота
npm run masters-bot

# Бот будет доступен в Telegram: @ProfitClub_staff_bot
```

#### **Клиентский бот (для клиентов)**
```bash
# Откройте ТРЕТИЙ терминал в папке проекта
cd "c:/Users/timur/Downloads/Profit Club"

# Запуск клиентского бота
npm run client-bot

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
npm run dev

# Терминал 3: Мастерский бот
cd "c:/Users/timur/Downloads/Profit Club"
npm run masters-bot

# Терминал 4: Клиентский бот
cd "c:/Users/timur/Downloads/Profit Club"
npm run client-bot
```

## 🌐 **Адреса после запуска**

### **Веб-интерфейсы:**
- **Основной сайт**: http://localhost:3000
- **Админ-панель**: http://localhost:3000/admin
- **API эндпоинты**: http://localhost:3000/api/*

### **Telegram боты:**
- **Мастерский бот**: @ProfitClub_staff_bot
- **Клиентский бот**: @ProfitClub_club_bot

## 🔧 **Полезные команды**

### **Проверка статуса сервисов**
```bash
# Проверка запущенных процессов
tasklist | findstr node

# Проверка портов
netstat -an | findstr :3000
```

### **Остановка всех сервисов**
```bash
# Остановка сайта (Ctrl+C в терминале npm run dev)

# Остановка ботов (Ctrl+C в терминалах ботов)

# Остановка PostgreSQL
net stop postgresql-x64-15
```

### **Перезапуск при ошибках**
```bash
# Если сайт не запускается, очистите кэш:
rm -rf .next
npm run dev

# Если боты не запускаются, проверьте токены в .env.local
```

## ⚠️ **Важные замечания**

### **Перед запуском убедитесь:**
1. **PostgreSQL установлен и запущен**
2. **Файл `.env.local` существует с правильными токенами**
3. **Все зависимости установлены** (`npm install`)

### **Если что-то не работает:**
1. **Проверьте логи в терминалах**
2. **Убедитесь что порты не заняты**
3. **Проверьте переменные окружения в `.env.local`**

## 🎯 **Быстрый старт (копируйте и вставьте)**

```bash
# 1. Запуск базы данных
net start postgresql-x64-15

# 2. Запуск сайта (в новом терминале)
cd "c:/Users/timur/Downloads/Profit Club"
npm run dev

# 3. Запуск мастерского бота (в новом терминале)
cd "c:/Users/timur/Downloads/Profit Club"
npm run masters-bot

# 4. Запуск клиентского бота (в новом терминале)
cd "c:/Users/timur/Downloads/Profit Club"
npm run client-bot
```

**После запуска всех сервисов проект будет полностью готов к работе!** 🎉
