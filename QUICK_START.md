# 🚀 **Быстрый запуск проекта**

## ⚡ **Используйте `.\npm` вместо `npm`**

## 🎯 **Команды для запуска:**

### **1. Запуск базы данных**
```bash
net start postgresql-x64-15
```

### **2. Запуск сайта**
```bash
.\npm run dev
```

### **3. Запуск ботов**
```bash
.\npm run masters-bot
.\npm run client-bot
```

### **4. Установка зависимостей**
```bash
.\npm install
```

## 🔄 **Полный порядок запуска:**

```bash
# Терминал 1: База данных
net start postgresql-x64-15

# Терминал 2: Сайт
.\npm run dev

# Терминал 3: Мастерский бот
.\npm run masters-bot

# Терминал 4: Клиентский бот
.\npm run client-bot
```

## 🌐 **Адреса после запуска:**
- **Сайт**: http://localhost:3000
- **Админ-панель**: http://localhost:3000/admin
- **Мастерский бот**: @ProfitClub_staff_bot
- **Клиентский бот**: @ProfitClub_club_bot

## 📝 **Почему `.\npm`?**
PowerShell требует `.\` для запуска файлов из текущей директории

**Готово! Теперь используйте `.\npm run dev`** 🎉
