# Masters Mini-App Phase 2 — Design Spec

## Summary

Add full functionality to all 4 remaining tabs in the masters mini-app: Statistics, Finance, Portfolio, and Clients. Migrate photo storage to Supabase Storage.

## Architecture

All new pages live inside existing `app/(master)/master/` route group with shared light-theme layout. New API endpoints under `/api/master/`. Two new DB tables (`masterPortfolio`, `masterClientNotes`) and one new field (`commissionPercent` on `masters`). Supabase Storage for portfolio photos and master profile photos.

## Schema Changes

### New field on `masters` table
- `commissionPercent` — integer, default 50 (percent master earns from each service)

### New table: `masterPortfolio`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| masterId | integer FK → masters.id | |
| imageUrl | varchar(500) | Supabase Storage URL |
| description | varchar(200) | Optional caption |
| serviceId | integer FK → services.id | Nullable — link to service type |
| createdAt | timestamp | default now() |

### New table: `masterClientNotes`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| masterId | integer FK → masters.id | |
| clientIdentifier | varchar(20) | Client phone number |
| note | text | Master's note about client |
| updatedAt | timestamp | default now() |

## Tab 1: Statistics (`/master/stats`)

### Period selector
Toggle: Неделя / Месяц / Период (custom date range picker for "Период")

### Metric cards (top row, 2x2 grid)
- **Клиентов** — count of unique `clientPhone` in appointments for period
- **Записей** — count of confirmed appointments for period
- **Загруженность** — (total appointment hours / total work slot hours) × 100%
- **Средний чек** — average service price across appointments

### Top services
Ranked list of services by frequency: service name, count, bar visualization (div width proportional to max)

### Daily chart
Simple bar chart (div-based, no chart library): one bar per day showing number of appointments. Days with 0 appointments shown as empty.

### Data source
JOIN `appointments` (status=confirmed, masterId=X, date in range) + `services` (price, name) + `workSlots` (for utilization %)

## Tab 2: Finance (`/master/finance`)

### Period selector
Same as Statistics tab — Неделя / Месяц / Период

### Summary cards (3 cards)
- **Доход салона** — sum of `services.price` for all confirmed appointments in period
- **Мой заработок** — salon revenue × (`masters.commissionPercent` / 100)
- **Записей** — appointment count for period

### Service breakdown
Table rows: service name | count | total revenue | master's share. Sorted by revenue descending.

### Daily history
Collapsible list of days. Each day shows: date, total revenue, master's share. Expand to see individual appointments (time, service, client, price).

## Tab 3: Portfolio (`/master/portfolio`)

### Photo grid
2-column grid of square thumbnails. "+" card at the start to add new photo.

### Upload flow
1. Tap "+" → native file picker (camera/gallery via `<input type="file" accept="image/*">`)
2. Optional: add description text, select related service from dropdown
3. Upload to Supabase Storage bucket `portfolio` → save URL to `masterPortfolio` table
4. Show in grid immediately after upload

### Delete flow
Tap photo → full-screen preview with delete button → confirm → delete from Storage + DB

### Migration: master profile photos
Move existing master photos from `public/uploads/masters/` to Supabase Storage bucket `masters`. Update `masters.photoUrl` field to point to new URL.

## Tab 4: Clients (`/master/clients`)

### Client list
Derived from `appointments` — unique clients by `clientPhone` where `masterId` matches.
Each row: client name, phone, visit count, last visit date.
Search bar at top: filters by name or phone.

### Client detail (tap on client)
Slide-up card or new view:
- **Header:** Name, phone, telegram ID (if available)
- **Action buttons:**
  - "Позвонить" → `<a href="tel:+7...">` (native phone call)
  - "Telegram" → `<a href="tg://user?id=...">` (if `clientTelegramId` exists)
- **Visit history:** List of appointments — date, service name, price. Sorted newest first.
- **Notes:** Textarea with master's note. Auto-saves on blur. Stored in `masterClientNotes`.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/master/stats?masterId=X&from=DATE&to=DATE` | Stats + finance data for period |
| GET | `/api/master/clients?masterId=X` | Unique client list with visit counts |
| GET | `/api/master/clients/detail?masterId=X&phone=PHONE` | Client visit history + note |
| POST | `/api/master/clients/note` | Save/update client note |
| GET | `/api/master/portfolio?masterId=X` | Portfolio photo list |
| POST | `/api/master/portfolio/upload` | Upload photo to Supabase Storage |
| DELETE | `/api/master/portfolio?id=X&masterId=X` | Delete photo |

## File Structure

```
db/schema-postgres.ts              — ADD masterPortfolio, masterClientNotes tables; ADD commissionPercent to masters
lib/supabase-storage.ts            — Supabase Storage upload/delete helpers

app/api/master/
  stats/route.ts                   — Stats + finance data
  clients/route.ts                 — Client list
  clients/detail/route.ts          — Client detail + history
  clients/note/route.ts            — Save client note
  portfolio/route.ts               — GET list + DELETE photo
  portfolio/upload/route.ts        — POST upload photo

app/(master)/master/
  stats/page.tsx                   — Statistics page
  finance/page.tsx                 — Finance page
  portfolio/page.tsx               — Portfolio page
  clients/page.tsx                 — Clients page

components/master/
  MasterPeriodSelector.tsx         — Shared period toggle (week/month/custom)
  MasterStatCards.tsx              — 2x2 metric cards grid
  MasterTopServices.tsx            — Ranked service list with bars
  MasterDailyChart.tsx             — Simple div-based bar chart
  MasterFinanceSummary.tsx         — 3 finance cards
  MasterServiceBreakdown.tsx       — Revenue breakdown table
  MasterDailyHistory.tsx           — Collapsible daily revenue list
  MasterPortfolioGrid.tsx          — Photo grid with upload
  MasterPhotoUpload.tsx            — Upload modal (file + description + service)
  MasterClientList.tsx             — Searchable client list
  MasterClientDetail.tsx           — Client card with history + notes + actions
```

## Design System
Same as Phase 1: light theme, `#FAFAFA` background, wine-red `#B2223C` accents, Montserrat font, SVG line icons.
