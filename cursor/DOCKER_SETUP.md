# Настройка PostgreSQL через Docker

## Быстрый старт

### 1. Запустите PostgreSQL в Docker

В терминале в папке проекта выполните:

```bash
docker-compose up -d
```

Эта команда:
- Скачает образ PostgreSQL (если его нет)
- Создаст контейнер с именем `profit_club_db`
- Создаст базу данных `profit_club`
- Настроит пользователя `postgres` с паролем `postgres123`
- Откроет порт 5432

### 2. Проверьте, что контейнер запущен

```bash
docker ps
```

Вы должны увидеть контейнер `profit_club_db` в списке.

### 3. Создайте файл `.env.local`

В корне проекта создайте файл `.env.local` со следующим содержимым:

```
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/profit_club
```

### 4. Примените схему к базе данных

```bash
npm run db:push
```

### 5. Заполните базу данных

```bash
npm run db:seed
```

### 6. Откройте Drizzle Studio

```bash
npm run db:studio
```

Откроется браузер: http://localhost:4983

## Управление контейнером

### Остановить контейнер:
```bash
docker-compose down
```

### Остановить и удалить данные:
```bash
docker-compose down -v
```

### Запустить снова:
```bash
docker-compose up -d
```

### Посмотреть логи:
```bash
docker-compose logs postgres
```

## Данные для подключения

- **Пользователь**: `postgres`
- **Пароль**: `postgres123`
- **Хост**: `localhost`
- **Порт**: `5432`
- **База данных**: `profit_club`

## Если порт 5432 уже занят

Если у вас уже запущен PostgreSQL на порту 5432, измените порт в `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"  # Внешний порт 5433, внутренний 5432
```

И обновите `.env.local`:
```
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/profit_club
```






