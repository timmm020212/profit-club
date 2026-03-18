# Шаги по восстановлению базы данных после установки Node.js v20

## 1. Проверка новой версии
```powershell
node --version
npm --version
```

## 2. Переустановка зависимостей
```powershell
npm install
```

## 3. Пересборка better-sqlite3
```powershell
npm rebuild better-sqlite3
```

## 4. Восстановление оригинального API
```powershell
Move-Item "app/api/services/route.ts" "app/api/services/route-mock.ts" -Force
Move-Item "app/api/services/route-old.ts" "app/api/services/route.ts" -Force
```

## 5. Проверка базы данных
```powershell
npm run db:push
```

## 6. Запуск сайта
```powershell
npm run dev
```

## 7. Проверка API
```powershell
curl http://localhost:3000/api/services
```

## 8. Проверка сайта
Открыть http://localhost:3000 в браузере
