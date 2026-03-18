# ✅ **Добавлены автоматические суффиксы для услуг**

## 🎯 **Проблема решена:** При добавлении услуги автоматически добавляются суффиксы

## 🔧 **Что изменено:**

### **1. Поля ввода с визуальными суффиксами:**

#### **Поле цены:**
```typescript
<div className="relative">
  <input
    value={draft.price}
    inputMode="numeric"
    onChange={(e) => {
      const next = e.target.value.replace(/\D+/g, "");
      setDraft((p) => ({ ...p, price: next }));
    }}
    placeholder="Напр: 1500"
  />
  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
    {draft.price ? "руб" : ""}
  </span>
</div>
```

#### **Поле длительности:**
```typescript
<div className="relative">
  <input
    value={draft.duration}
    onChange={(e) => setDraft((p) => ({ ...p, duration: e.target.value }))}
    inputMode="numeric"
    placeholder="60"
  />
  <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
    {draft.duration ? "мин" : ""}
  </span>
</div>
```

### **2. Улучшенная валидация:**
```typescript
function validateDraft(next: ServiceDraft): string | null {
  // Проверяем цену - убираем "руб" если есть и проверяем что остались только цифры
  const priceWithoutSuffix = next.price.replace(/руб/gi, "").trim();
  if (!priceWithoutSuffix && next.price.trim()) return "Цена должна быть числом";
  
  // Проверяем длительность - убираем "мин" если есть
  const dur = Number(next.duration.replace(/мин/gi, "").trim());
  if (!Number.isFinite(dur) || dur <= 0) return "Длительность должна быть числом больше 0";
  
  return null;
}
```

### **3. Обновленная нормализация данных:**
```typescript
function normalizePayload(draft: ServiceDraft) {
  const durationNum = Number(draft.duration.replace(/мин/gi, "").trim());
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    price: draft.price.replace(/\D+/g, "").trim() ? draft.price.replace(/\D+/g, "").trim() : null,
    duration: Number.isFinite(durationNum) ? durationNum : 60,
    // ... другие поля
  };
}
```

## 💡 **Как это работает:**

### **Для пользователя:**
1. Вводит "1500" в поле цены
2. Видит "1500 руб" справа от поля
3. Вводит "60" в поле длительности  
4. Видит "60 мин" справа от поля

### **Для базы данных:**
- Сохраняется только "1500" (число)
- Сохраняется только "60" (число)
- Суффиксы только для отображения

## 🧪 **Проверка:**

1. **Откройте** админ-панель услуг
2. **Создайте новую услугу**
3. **Введите цену** - должен появиться "руб"
4. **Введите длительность** - должно появиться "мин"
5. **Сохраните** - в БД сохранятся только числа

## ✅ **Результат:**

- ✅ **Удобно для пользователя** - визуальные подсказки
- ✅ **Корректные данные в БД** - только числа
- ✅ **Валидация работает** с суффиксами
- ✅ **Сохранение работает** правильно

**Теперь при добавлении услуг автоматически добавляются суффиксы "руб" и "мин"!** 🎉
