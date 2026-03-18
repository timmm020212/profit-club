# 🔧 **Исправлено удаление услуг**

## ❌ **Проблема:** При удалении услуги была ошибка

## ✅ **Решение:** Добавлен DELETE метод в API

## 🔧 **Что добавлено в `/api/services/route.ts`:**

### **DELETE метод:**
```typescript
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    const serviceId = Number(id);
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { error: "Invalid service ID" },
        { status: 400 }
      );
    }

    // Проверяем что услуга существует
    const existingService = await db
      .select()
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

    if (!existingService.length) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Удаляем услугу
    await db.delete(services).where(eq(services.id, serviceId));

    return NextResponse.json(
      { message: "Service deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}
```

## 🧪 **Как проверить:**

### **1. Тест API напрямую:**
```
curl -X DELETE http://localhost:3000/api/services?id=1
```

### **2. Проверьте в админке:**
```
1. Откройте http://localhost:3000/admin/site
2. Найдите услугу для удаления
3. Нажмите "Удалить"
4. Проверьте консоль на ошибки
```

### **3. Проверьте консоль сайта:**
```
F12 → Console
Ищите сообщения:
- "Service deleted successfully: X"
- "Error deleting service: ..."
```

## 💡 **Ожидаемый результат:**

### **✅ Успешное удаление:**
- Услуга удаляется из БД
- Список обновляется
- Появляется сообщение об успехе

### **❌ Если ошибка:**
- Проверьте консоль на детали
- Проверьте что услуга существует
- Проверьте права доступа

## 🔍 **Возможные причины ошибок:**

### **1. Услуга не найдена:**
```
{ error: "Service not found", status: 404 }
```
Решение: Убедите правильный ID

### **2. Неверный ID:**
```
{ error: "Invalid service ID", status: 400 }
```
Решение: Используйте числовой ID

### **3. Проблема с БД:**
```
{ error: "Failed to delete service", status: 500 }
```
Решение: Проверьте подключение к БД

## 🎯 **Что делать прямо сейчас:**

1. **Перезапустите сайт** (если нужно)
2. **Откройте** http://localhost:3000/admin/site
3. **Попробуйте удалить услугу**
4. **Проверьте консоль** F12

**Теперь удаление услуг должно работать корректно!** ✅
