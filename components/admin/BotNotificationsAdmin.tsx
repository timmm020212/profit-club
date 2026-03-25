"use client";

import { useState, useEffect, useCallback } from "react";
import NotificationCard from "./NotificationCard";

type BotType = "client" | "masters";

const TABS: { key: BotType; label: string }[] = [
  { key: "client", label: "Бот клиентов" },
  { key: "masters", label: "Бот мастеров" },
];

// Default templates for reset button (duplicated from lib/bot-templates.ts to avoid server import)
const DEFAULT_MESSAGES: Record<string, string> = {
  reminder_24h: "⏰ Напоминание о записи\n\n📅 Завтра, {{date}}, {{startTime}}\n💇 {{serviceName}}\n👩 {{masterName}}\n📍 Profit Club",
  reminder_2h: "⏰ Скоро запись!\n\n📅 Сегодня, {{startTime}}\n💇 {{serviceName}}\n👩 {{masterName}}\n📍 Profit Club",
  optimization_proposal: "🔄 Предложение о переносе\n\n💇 {{serviceName}}\n👩 {{masterName}}\n\n❌ Текущее время: {{oldTime}}\n✅ Предлагаемое: {{newTime}}\n\nЭто позволит оптимизировать расписание мастера.",
  master_new_appointment: "📌 Новая запись\n\n👤 {{clientName}}\n📞 {{clientPhone}}\n💇 {{serviceName}}\n📅 {{date}}, {{startTime}}–{{endTime}}",
  master_cancellation: "❌ Запись отменена\n\n👤 {{clientName}}\n💇 {{serviceName}}\n📅 {{date}}, {{startTime}}–{{endTime}}",
  master_break: "☕ Перерыв {{breakMinutes}} мин\n\n📅 {{date}}\n🕐 {{breakStart}}–{{breakEnd}}",
  master_early_finish: "🏁 Вы свободны с {{freeFrom}}\n\n📅 {{date}}\n🕐 Последняя запись заканчивается в {{freeFrom}}\n📋 Конец смены: {{shiftEnd}}",
};

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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-violet-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map(t => (
              <NotificationCard
                key={t.slug}
                template={t}
                defaultTemplate={DEFAULT_MESSAGES[t.slug] || t.messageTemplate}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
