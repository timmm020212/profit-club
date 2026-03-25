# Bot Notifications Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/admin/bots` page with notification template editor (text + variables + toggle) for client and master bots, and wire bots to read templates from DB.

**Architecture:** New DB table `bot_notification_templates` stores templates with slug, text, variables, enabled flag. Admin UI reads/writes via API. Bot code reads templates at send time with hardcoded fallback. Auto-seed on first API call.

**Tech Stack:** Next.js 15, Drizzle ORM + PostgreSQL, Tailwind CSS, Telegraf

**Spec:** `docs/superpowers/specs/2026-03-25-bot-notifications-admin-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `db/schema-postgres.ts` | Add `botNotificationTemplates` table |
| Create | `app/api/admin/bot-notifications/route.ts` | GET: list templates (+ auto-seed) |
| Create | `app/api/admin/bot-notifications/[slug]/route.ts` | PUT: update template text/enabled |
| Create | `app/(app)/admin/bots/page.tsx` | Admin bots page |
| Create | `components/admin/BotNotificationsAdmin.tsx` | Tabs + template list |
| Create | `components/admin/NotificationCard.tsx` | Single notification editor card |
| Create | `lib/bot-templates.ts` | Shared: getTemplate, renderTemplate, DEFAULT_TEMPLATES |
| Modify | `telegram-bot/client/reminders.ts` | Use DB templates for reminders + optimization |
| Modify | `telegram-bot/client/notify-master.ts` | Use DB templates for master notifications |
| Modify | `components/AdminHeader.tsx` | Add "Боты" nav link |

---

### Task 1: DB Schema + Shared Template Utilities

**Files:**
- Modify: `db/schema-postgres.ts`
- Create: `lib/bot-templates.ts`

- [ ] **Step 1: Add table to schema**

In `db/schema-postgres.ts`, after the `adminSettings` table definition (around line 146), add:

```typescript
export const botNotificationTemplates = pgTable("bot_notification_templates", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  botType: varchar("bot_type", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  messageTemplate: text("message_template").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  variables: text("variables").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Create shared template utilities**

```typescript
// lib/bot-templates.ts
import { db } from "@/db";
import { botNotificationTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface NotificationTemplate {
  slug: string;
  botType: "client" | "masters";
  name: string;
  messageTemplate: string;
  isEnabled: boolean;
  variables: string[];
}

export const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  // Client bot
  {
    slug: "reminder_24h",
    botType: "client",
    name: "Напоминание за 24ч",
    messageTemplate: "⏰ Напоминание о записи\n\n📅 Завтра, {{date}}, {{startTime}}\n💇 {{serviceName}}\n👩 {{masterName}}\n📍 Profit Club",
    isEnabled: true,
    variables: ["date", "startTime", "serviceName", "masterName"],
  },
  {
    slug: "reminder_2h",
    botType: "client",
    name: "Напоминание за 2ч",
    messageTemplate: "⏰ Скоро запись!\n\n📅 Сегодня, {{startTime}}\n💇 {{serviceName}}\n👩 {{masterName}}\n📍 Profit Club",
    isEnabled: true,
    variables: ["date", "startTime", "serviceName", "masterName"],
  },
  {
    slug: "optimization_proposal",
    botType: "client",
    name: "Предложение переноса",
    messageTemplate: "🔄 Предложение о переносе\n\n💇 {{serviceName}}\n👩 {{masterName}}\n\n❌ Текущее время: {{oldTime}}\n✅ Предлагаемое: {{newTime}}\n\nЭто позволит оптимизировать расписание мастера.",
    isEnabled: true,
    variables: ["serviceName", "masterName", "oldTime", "newTime"],
  },
  // Masters bot
  {
    slug: "master_new_appointment",
    botType: "masters",
    name: "Новая запись",
    messageTemplate: "📌 Новая запись\n\n👤 {{clientName}}\n📞 {{clientPhone}}\n💇 {{serviceName}}\n📅 {{date}}, {{startTime}}–{{endTime}}",
    isEnabled: true,
    variables: ["clientName", "clientPhone", "serviceName", "date", "startTime", "endTime"],
  },
  {
    slug: "master_cancellation",
    botType: "masters",
    name: "Отмена записи",
    messageTemplate: "❌ Запись отменена\n\n👤 {{clientName}}\n💇 {{serviceName}}\n📅 {{date}}, {{startTime}}–{{endTime}}",
    isEnabled: true,
    variables: ["clientName", "serviceName", "date", "startTime", "endTime"],
  },
  {
    slug: "master_break",
    botType: "masters",
    name: "Перерыв",
    messageTemplate: "☕ Перерыв {{breakMinutes}} мин\n\n📅 {{date}}\n🕐 {{breakStart}}–{{breakEnd}}",
    isEnabled: true,
    variables: ["date", "breakStart", "breakEnd", "breakMinutes"],
  },
  {
    slug: "master_early_finish",
    botType: "masters",
    name: "Ранний конец смены",
    messageTemplate: "🏁 Вы свободны с {{freeFrom}}\n\n📅 {{date}}\n🕐 Последняя запись заканчивается в {{freeFrom}}\n📋 Конец смены: {{shiftEnd}}",
    isEnabled: true,
    variables: ["date", "freeFrom", "shiftEnd"],
  },
];

export async function getTemplate(slug: string): Promise<{ template: string; enabled: boolean } | null> {
  try {
    const rows = await db.select({
      messageTemplate: botNotificationTemplates.messageTemplate,
      isEnabled: botNotificationTemplates.isEnabled,
    }).from(botNotificationTemplates)
      .where(eq(botNotificationTemplates.slug, slug))
      .limit(1);

    if (rows.length > 0) {
      return { template: rows[0].messageTemplate, enabled: rows[0].isEnabled };
    }
  } catch (e) {
    console.error(`[bot-templates] Error loading template ${slug}:`, e);
  }

  // Fallback to default
  const def = DEFAULT_TEMPLATES.find(t => t.slug === slug);
  if (def) return { template: def.messageTemplate, enabled: def.isEnabled };
  return null;
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}
```

- [ ] **Step 3: Push schema to DB**

```bash
npx drizzle-kit push
```

- [ ] **Step 4: Commit**

```bash
git add db/schema-postgres.ts lib/bot-templates.ts
git commit -m "feat: add bot_notification_templates table and shared template utilities"
```

---

### Task 2: API Endpoints

**Files:**
- Create: `app/api/admin/bot-notifications/route.ts`
- Create: `app/api/admin/bot-notifications/[slug]/route.ts`

- [ ] **Step 1: Create GET endpoint with auto-seed**

```typescript
// app/api/admin/bot-notifications/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { botNotificationTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_TEMPLATES } from "@/lib/bot-templates";

export const dynamic = "force-dynamic";

async function seedIfEmpty() {
  const existing = await db.select({ id: botNotificationTemplates.id })
    .from(botNotificationTemplates).limit(1);
  if (existing.length > 0) return;

  for (const t of DEFAULT_TEMPLATES) {
    await db.insert(botNotificationTemplates).values({
      slug: t.slug,
      botType: t.botType,
      name: t.name,
      messageTemplate: t.messageTemplate,
      isEnabled: t.isEnabled,
      variables: JSON.stringify(t.variables),
    });
  }
}

export async function GET(request: Request) {
  try {
    await seedIfEmpty();
    const { searchParams } = new URL(request.url);
    const botType = searchParams.get("botType");

    const conditions = botType ? eq(botNotificationTemplates.botType, botType) : undefined;
    const templates = await db.select().from(botNotificationTemplates).where(conditions);

    return NextResponse.json(templates.map(t => ({
      ...t,
      variables: JSON.parse(t.variables),
    })));
  } catch (error) {
    console.error("Error fetching notification templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create PUT endpoint**

```typescript
// app/api/admin/bot-notifications/[slug]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { botNotificationTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const updates: any = { updatedAt: new Date() };

    if (body.messageTemplate !== undefined) updates.messageTemplate = body.messageTemplate;
    if (body.isEnabled !== undefined) updates.isEnabled = body.isEnabled;

    const result = await db.update(botNotificationTemplates)
      .set(updates)
      .where(eq(botNotificationTemplates.slug, slug))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...result[0],
      variables: JSON.parse(result[0].variables),
    });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/bot-notifications/route.ts app/api/admin/bot-notifications/[slug]/route.ts
git commit -m "feat: add bot notification templates API (GET + PUT + auto-seed)"
```

---

### Task 3: Admin UI — Page + Components

**Files:**
- Create: `app/(app)/admin/bots/page.tsx`
- Create: `components/admin/BotNotificationsAdmin.tsx`
- Create: `components/admin/NotificationCard.tsx`
- Modify: `components/AdminHeader.tsx` (line 13-17)

- [ ] **Step 1: Create admin page**

```typescript
// app/(app)/admin/bots/page.tsx
import BotNotificationsAdmin from "@/components/admin/BotNotificationsAdmin";

export default function AdminBotsPage() {
  return <BotNotificationsAdmin />;
}
```

- [ ] **Step 2: Create NotificationCard component**

```typescript
// components/admin/NotificationCard.tsx
"use client";

import { useState, useRef, useCallback } from "react";

interface Template {
  id: number;
  slug: string;
  name: string;
  messageTemplate: string;
  isEnabled: boolean;
  variables: string[];
}

interface Props {
  template: Template;
  defaultTemplate: string;
  onUpdate: (slug: string, updates: { messageTemplate?: string; isEnabled?: boolean }) => Promise<void>;
}

export default function NotificationCard({ template, defaultTemplate, onUpdate }: Props) {
  const [text, setText] = useState(template.messageTemplate);
  const [enabled, setEnabled] = useState(template.isEnabled);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = useCallback((varName: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const insert = `{{${varName}}}`;
    const newText = text.slice(0, start) + insert + text.slice(end);
    setText(newText);
    setDirty(true);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + insert.length;
    }, 0);
  }, [text]);

  async function handleToggle() {
    const newVal = !enabled;
    setEnabled(newVal);
    await onUpdate(template.slug, { isEnabled: newVal });
  }

  async function handleSave() {
    setSaving(true);
    await onUpdate(template.slug, { messageTemplate: text });
    setDirty(false);
    setSaving(false);
  }

  function handleReset() {
    setText(defaultTemplate);
    setDirty(true);
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0D0D10] p-5">
      {/* Header: name + toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-100">{template.name}</h3>
        <button
          onClick={handleToggle}
          className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? "bg-violet-600" : "bg-white/10"}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => { setText(e.target.value); setDirty(true); }}
        rows={5}
        className="w-full bg-[#1C1C22] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-violet-500/40 transition-colors resize-y"
        style={{ minHeight: 100 }}
      />

      {/* Variable chips */}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {template.variables.map((v) => (
          <button
            key={v}
            onClick={() => insertVariable(v)}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold cursor-pointer hover:bg-amber-500/30 transition-colors"
          >
            {`{{${v}}}`}
          </button>
        ))}
      </div>

      {/* Actions */}
      {dirty && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Сохраняю..." : "Сохранить"}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/60 text-xs font-medium transition-colors"
          >
            Сбросить
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create BotNotificationsAdmin component**

```typescript
// components/admin/BotNotificationsAdmin.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import NotificationCard from "./NotificationCard";
import { DEFAULT_TEMPLATES } from "@/lib/bot-templates";

type BotType = "client" | "masters";

const TABS: { key: BotType; label: string }[] = [
  { key: "client", label: "Бот клиентов" },
  { key: "masters", label: "Бот мастеров" },
];

interface Template {
  id: number;
  slug: string;
  botType: string;
  name: string;
  messageTemplate: string;
  isEnabled: boolean;
  variables: string[];
}

export default function BotNotificationsAdmin() {
  const [activeTab, setActiveTab] = useState<BotType>("client");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async (botType: BotType) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bot-notifications?botType=${botType}`);
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates(activeTab);
  }, [activeTab, fetchTemplates]);

  async function handleUpdate(slug: string, updates: { messageTemplate?: string; isEnabled?: boolean }) {
    try {
      const res = await fetch(`/api/admin/bot-notifications/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setTemplates(prev => prev.map(t => t.slug === slug ? updated : t));
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[#070709]">
      <div className="mx-auto max-w-screen-lg px-4 lg:px-6 py-8">
        <h1 className="text-xl font-bold text-zinc-100 mb-1">Уведомления ботов</h1>
        <p className="text-sm text-zinc-500 mb-6">Настройка текстов и переключателей уведомлений</p>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/[0.07] mb-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? "text-violet-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-violet-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map(t => {
              const def = DEFAULT_TEMPLATES.find(d => d.slug === t.slug);
              return (
                <NotificationCard
                  key={t.slug}
                  template={t}
                  defaultTemplate={def?.messageTemplate || t.messageTemplate}
                  onUpdate={handleUpdate}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add nav link in AdminHeader**

In `components/AdminHeader.tsx`, change line 13-17 from:

```typescript
const navItems = [
  { href: "/admin", label: "Расписание" },
  { href: "/admin/services", label: "Услуги" },
  { href: "/admin/analytics", label: "Аналитика" },
];
```

to:

```typescript
const navItems = [
  { href: "/admin", label: "Расписание" },
  { href: "/admin/services", label: "Услуги" },
  { href: "/admin/analytics", label: "Аналитика" },
  { href: "/admin/bots", label: "Боты" },
];
```

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/admin/bots/page.tsx" components/admin/BotNotificationsAdmin.tsx components/admin/NotificationCard.tsx components/AdminHeader.tsx
git commit -m "feat: add bot notifications admin UI with tabs, template editor, variable chips"
```

---

### Task 4: Wire Bots to Use DB Templates

**Files:**
- Modify: `telegram-bot/client/reminders.ts`
- Modify: `telegram-bot/client/notify-master.ts`

- [ ] **Step 1: Update reminders.ts to use DB templates**

In `telegram-bot/client/reminders.ts`, add imports at the top (after existing imports):

```typescript
import { botNotificationTemplates } from "../../db/schema-postgres";
```

Add helper functions after the imports:

```typescript
async function getTemplate(slug: string): Promise<{ template: string; enabled: boolean } | null> {
  try {
    const rows = await db.select({
      messageTemplate: botNotificationTemplates.messageTemplate,
      isEnabled: botNotificationTemplates.isEnabled,
    }).from(botNotificationTemplates)
      .where(eq(botNotificationTemplates.slug, slug))
      .limit(1);
    if (rows.length > 0) return { template: rows[0].messageTemplate, enabled: rows[0].isEnabled };
  } catch {}
  return null;
}

function renderTpl(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}
```

In `checkAndSendReminders`, replace the hardcoded message generation (around lines 46-48):

```typescript
        const msg = type === "24hour"
          ? `⏰ Напоминание о записи\n\n📅 Завтра, ${formatDateRu(apt.appointmentDate)}, ${apt.startTime}\n💇 ${svc?.name || "Услуга"}\n👩 ${mst?.fullName || "Мастер"}\n📍 Profit Club`
          : `⏰ Скоро запись!\n\n📅 Сегодня, ${apt.startTime}\n💇 ${svc?.name || "Услуга"}\n👩 ${mst?.fullName || "Мастер"}\n📍 Profit Club`;
```

with:

```typescript
        const slug = type === "24hour" ? "reminder_24h" : "reminder_2h";
        const tpl = await getTemplate(slug);
        if (tpl && !tpl.enabled) continue; // Skip if disabled

        const vars = {
          date: formatDateRu(apt.appointmentDate),
          startTime: apt.startTime,
          serviceName: svc?.name || "Услуга",
          masterName: mst?.fullName || "Мастер",
        };
        const msg = tpl
          ? renderTpl(tpl.template, vars)
          : type === "24hour"
            ? `⏰ Напоминание о записи\n\n📅 Завтра, ${vars.date}, ${vars.startTime}\n💇 ${vars.serviceName}\n👩 ${vars.masterName}\n📍 Profit Club`
            : `⏰ Скоро запись!\n\n📅 Сегодня, ${vars.startTime}\n💇 ${vars.serviceName}\n👩 ${vars.masterName}\n📍 Profit Club`;
```

In `checkAutoOptimization`, replace the hardcoded optimization proposal text (around line 124):

```typescript
                      text: `🔄 Предложение о переносе\n\n💇 ${svc?.name || "Услуга"}\n👩 ${master.fullName}\n\n❌ Текущее время: ${move.oldStartTime}–${move.oldEndTime}\n✅ Предлагаемое: ${move.newStartTime}–${move.newEndTime}\n\nЭто позволит оптимизировать расписание мастера.`,
```

with:

```typescript
                      text: await (async () => {
                        const optTpl = await getTemplate("optimization_proposal");
                        if (optTpl && !optTpl.enabled) return null;
                        const optVars = {
                          serviceName: svc?.name || "Услуга",
                          masterName: master.fullName,
                          oldTime: `${move.oldStartTime}–${move.oldEndTime}`,
                          newTime: `${move.newStartTime}–${move.newEndTime}`,
                        };
                        return optTpl
                          ? renderTpl(optTpl.template, optVars)
                          : `🔄 Предложение о переносе\n\n💇 ${optVars.serviceName}\n👩 ${optVars.masterName}\n\n❌ Текущее время: ${optVars.oldTime}\n✅ Предлагаемое: ${optVars.newTime}\n\nЭто позволит оптимизировать расписание мастера.`;
                      })(),
```

And wrap the send in a null check (skip if template returned null = disabled):

```typescript
                      // Before the fetch, add:
                      const proposalText = /* the text from above */;
                      if (!proposalText) continue;
```

- [ ] **Step 2: Update notify-master.ts to use DB templates**

In `telegram-bot/client/notify-master.ts`, add import:

```typescript
import { botNotificationTemplates } from "../../db/schema-postgres";
```

Add helpers (same as reminders):

```typescript
async function getTemplate(slug: string): Promise<{ template: string; enabled: boolean } | null> {
  try {
    const rows = await db.select({
      messageTemplate: botNotificationTemplates.messageTemplate,
      isEnabled: botNotificationTemplates.isEnabled,
    }).from(botNotificationTemplates)
      .where(eq(botNotificationTemplates.slug, slug))
      .limit(1);
    if (rows.length > 0) return { template: rows[0].messageTemplate, enabled: rows[0].isEnabled };
  } catch {}
  return null;
}

function renderTpl(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}
```

In `notifyMasterNewAppointment` (around line 55-74), replace the hardcoded text block:

```typescript
  const text =
    `📌 Новая запись\n\n` +
    `👤 ${opts.clientName}${phone}\n` +
    `💇 ${opts.serviceName}\n` +
    `📅 ${date}, ${opts.startTime}–${opts.endTime}`;
```

with:

```typescript
  const tpl = await getTemplate("master_new_appointment");
  if (tpl && !tpl.enabled) return;
  const vars = {
    clientName: opts.clientName,
    clientPhone: opts.clientPhone || "",
    serviceName: opts.serviceName,
    date,
    startTime: opts.startTime,
    endTime: opts.endTime,
  };
  const text = tpl
    ? renderTpl(tpl.template, vars)
    : `📌 Новая запись\n\n👤 ${opts.clientName}${phone}\n💇 ${opts.serviceName}\n📅 ${date}, ${opts.startTime}–${opts.endTime}`;
```

Also remove the `getMasterSettings` check for `s.newAppointments` since enabled/disabled is now in the template table.

Apply same pattern to `notifyMasterCancellation` (slug: `master_cancellation`), `notifyMasterBreak` (slug: `master_break`), `notifyMasterEarlyFinish` (slug: `master_early_finish`).

- [ ] **Step 3: Commit**

```bash
git add telegram-bot/client/reminders.ts telegram-bot/client/notify-master.ts
git commit -m "feat: wire bots to read notification templates from DB"
```

---

### Task 5: Push Schema + Build Test

- [ ] **Step 1: Push schema to database**

```bash
npx drizzle-kit push
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: No errors. `/admin/bots` page compiles.

- [ ] **Step 3: Test API**

```bash
curl http://localhost:3000/api/admin/bot-notifications?botType=client
```

Expected: JSON array with 3 client templates (auto-seeded).

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: push schema, verify build"
```
