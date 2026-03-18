# Настройка базы данных

## Установка PostgreSQL

Убедитесь, что PostgreSQL установлен и запущен на вашем компьютере.

## Настройка подключения

1. Создайте файл `.env.local` в корне проекта (если его еще нет)
2. Укажите строку подключения к базе данных:

```
DATABASE_URL=postgresql://user:password@localhost:5432/profit_club
```

Замените `user`, `password` и `profit_club` на ваши данные.

## Создание базы данных

```sql
CREATE DATABASE profit_club;
```

## Генерация миграций

```bash
npm run db:generate
```

## Применение миграций

```bash
npm run db:push
```

Или используйте миграции:

```bash
npm run db:migrate
```

## Заполнение начальными данными

```bash
npm run db:seed
```

## Просмотр базы данных

```bash
npm run db:studio
```

Это откроет Drizzle Studio в браузере для просмотра и редактирования данных.






