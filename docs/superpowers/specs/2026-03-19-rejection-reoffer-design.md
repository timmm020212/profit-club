# Master Rejection → Admin Re-offer Flow

## Overview

Когда мастер отклоняет рабочий день, в админке появляется карточка с возможностью предложить другую дату/время.

## Flow

1. Мастер нажимает "Отклонить" (`reject_X`) в боте мастеров
2. Бот создаёт `workSlotChangeRequest` с `type: "master_rejection"`, `status: "pending"`
3. WorkSlot `adminUpdateStatus` = `"rejected"`
4. В админке в блоке "Запросы мастеров" появляется карточка с красным бейджем "Отклонено мастером"
5. Админ может:
   - **Предложить другое время** → выбирает дату (14 дней) → начало → конец → создаётся новый workSlot (`isConfirmed: false`), мастер получает уведомление с `confirm_X`/`reject_X`
   - **Удалить день** → удаляет workSlot, закрывает запрос

## Изменения в боте мастеров

В `callback_query` handler при `reject_X`:
- После `adminUpdateStatus: "rejected"` — создать `workSlotChangeRequest`:
```
workSlotId: slotId
masterId: master.id
type: "master_rejection"
status: "pending"
suggestedWorkDate: slot.workDate
suggestedStartTime: slot.startTime
suggestedEndTime: slot.endTime
```

## Изменения в админке

### AdminWorkSlotChangeRequests.tsx

Добавить обработку `type: "master_rejection"`:
- Красный бейдж "Отклонено мастером"
- Показать дату + время отклонённого дня
- Кнопка "Предложить другое время" → открывает inline форму
- Кнопка "Удалить день" → DELETE workSlot + PATCH request status

### Inline форма предложения

1. Выбор даты — кнопки ближайших 14 дней
2. Выбор начала смены — 07:00–14:00 шаг 1ч
3. Выбор конца — начало+4ч...начало+12ч шаг 1ч
4. Подтверждение → POST /api/work-slots-admin (создать новый slot) + уведомление мастеру

### API

- POST `/api/work-slots-admin` — уже существует для создания workSlot
- PATCH `/api/work-slot-change-requests?id=X&action=reject` — закрыть запрос
- Уведомление мастеру — через `notifyMasterAboutNewWorkDay` (существующая логика)
