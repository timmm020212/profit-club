# Способы доступа к базе данных

## 1. Drizzle Studio (локальный)

Drizzle Studio - это локальный инструмент, который запускается на вашем компьютере. Облачной версии не существует.

**Запуск:**
```bash
npm run db:studio
```

**Ссылка:** http://localhost:4983

## 2. pgAdmin (рекомендуется)

Если Drizzle Studio не работает, используйте pgAdmin:

1. Откройте pgAdmin 4
2. Добавьте новый сервер:
   - Name: `Profit Club DB`
   - Host: `localhost`
   - Port: `5433`
   - Username: `postgres`
   - Password: `postgres123`
3. В левой панели найдите: Servers → Profit Club DB → Databases → profit_club → Schemas → public → Tables → services
4. Правой кнопкой на таблице services → View/Edit Data → All Rows

## 3. Через Docker (командная строка)

```bash
# Подключиться к БД через psql
docker exec -it profit_club_db psql -U postgres -d profit_club

# Посмотреть все услуги
SELECT * FROM services;

# Выйти
\q
```

## 4. Через API (уже работает)

Ваш сайт уже использует данные из БД. Просто откройте:
http://localhost:3000

## 5. Онлайн инструменты для PostgreSQL

Если нужен веб-интерфейс, можно использовать:
- **Adminer** (легковесный веб-интерфейс)
- **pgAdmin Web** (если настроен)
- **DBeaver** (десктопное приложение)






