# Services Restructure — Design Spec

## Summary

Restructure the services system from a flat table to a 4-level hierarchy: categories → subgroups → services → variants. Populate with all services from profit-club.ru. Assign masters by specialization.

## Data Structure

### New table: `serviceCategories`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | varchar(100) | Category name |
| icon | varchar(10) | Emoji icon |
| order | integer | Sort order |
| isActive | boolean | default true |

### New table: `serviceSubgroups`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| categoryId | integer FK → serviceCategories | |
| name | varchar(100) | Subgroup name |
| order | integer | Sort order |

### Modified table: `services`
- ADD `subgroupId` (integer FK → serviceSubgroups)
- `price` and `duration` become optional — used as fallback when no variants exist
- Keep `categoryId` field removed — category derived from subgroup

### New table: `serviceVariants`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| serviceId | integer FK → services | |
| name | varchar(100) | Variant label (e.g. "Короткие волосы") |
| price | integer | Price in rubles |
| duration | integer | Duration in minutes |
| order | integer | Sort order |

### Modified table: `appointments`
- ADD `variantId` (integer, nullable FK → serviceVariants) — which variant was booked

## Categories (6)

1. 💇 Парикмахерские услуги
2. 💈 Мужской зал
3. 💄 Визаж
4. 💅 Маникюр и педикюр
5. ✨ Косметология
6. 💆 Уход за телом и депиляция

## Subgroups

### 💇 Парикмахерские услуги
- Стрижки
- Укладки
- Вечерние и свадебные причёски
- Окрашивание
- Мелирование
- Сложное окрашивание
- Блондирование
- Аиртач
- Смывка
- Плетение и ламинирование
- Уходы для волос

### 💈 Мужской зал
- Стрижки и укладки
- Борода
- Окрашивание и тонирование

### 💄 Визаж
- Макияж
- Брови и ресницы
- Перманентный макияж

### 💅 Маникюр и педикюр
- Маникюр
- Педикюр

### ✨ Косметология
- Аппаратная косметология
- Инъекции и контурная пластика
- Мезотерапия
- Чистки и пилинги
- PRP-терапия

### 💆 Уход за телом и депиляция
- Массаж
- Обертывания и SPA
- Восковая депиляция
- Полимерная депиляция
- Лазерная эпиляция

## UI Flow (Client)

1. **Category tabs** — horizontal scrollable chips at top (💇 💈 💄 💅 ✨ 💆)
2. **Subgroup sections** — headings within the scrollable area
3. **Service cards** — within each subgroup, grid of cards with name + starting price
4. **Variant modal** — tap card → mini-modal with radio buttons (variant name + price + duration), select → proceed to master selection
5. If service has **no variants** — skip modal, use service price/duration directly

## Booking Flow Changes

Current: select service → select master → select date → select time → confirm
New: select category tab → select service card → select variant (if any) → select master → date → time → confirm

In `appointments`:
- `serviceId` = the service
- `variantId` = the specific variant (null if no variants)
- Price/duration taken from variant if set, otherwise from service

## Master Assignment

Via `executorRole` on services (existing mechanism):
- Парикмахерские + Мужской зал: `executorRole: "парикмахер"` or `"барбер"`
- Визаж: `executorRole: "визажист"`
- Маникюр/педикюр: `executorRole: "маникюр"`
- Косметология: `executorRole: "косметолог"`
- Массаж/SPA: `executorRole: "массажист"`
- Депиляция: `executorRole: "депиляция"`

## Masters to Create/Update

| Name | Specialization | executorRole match |
|------|---------------|-------------------|
| Наталья Олюхова | Парикмахер-стилист | парикмахер |
| Ольга Бородина | Парикмахер-стилист | парикмахер |
| Наталья Зорькина | Парикмахер-стилист | парикмахер |
| Ирина Домбровская | Парикмахер-стилист | парикмахер |
| Ольга Силаева | Парикмахер-стилист | парикмахер |
| Маргарита Дереглазова | Парикмахер-стилист | парикмахер |
| Юлия Высоцкая | Барбер, депиляция | барбер, депиляция |
| Анжелика Нотычева | Визажист | визажист |
| Елена Фанина | Маникюр и педикюр | маникюр |
| Полина Беляева | Маникюр и педикюр | маникюр |
| Ольга Аганесова | Маникюр, педикюр, депиляция | маникюр, депиляция |
| Виктория Кожина | Врач-косметолог | косметолог |
| Ирина Харьковская | Врач-косметолог | косметолог |
| Ольга Мальцева | Медсестра косметологии | косметолог |
| Оксана Склярова | Массажист | массажист |

## API Changes

- `GET /api/services` — return categories → subgroups → services → variants (nested)
- `GET /api/service-categories` — list categories
- `POST /api/appointments` — accept `variantId` parameter
- `GET /api/available-slots` — use variant duration if `variantId` provided

## File Changes

```
db/schema-postgres.ts                         — ADD serviceCategories, serviceSubgroups, serviceVariants tables; ADD subgroupId to services, variantId to appointments
db/seed-services.ts                           — NEW: seed script with all services data from profit-club.ru
app/api/services/route.ts                     — MODIFY: return nested structure
app/api/appointments/route.ts                 — MODIFY: accept variantId, use variant price/duration
app/api/available-slots/route.ts              — MODIFY: use variant duration
components/BookingFlow.tsx (or equivalent)     — MODIFY: category tabs, subgroup sections, variant modal
components/ServiceVariantModal.tsx             — NEW: variant selection modal
```
