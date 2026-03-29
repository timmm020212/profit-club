"use client";

import { useState, useEffect, useCallback } from "react";
import MasterTabBar from "@/components/master/MasterTabBar";

interface Client {
  name: string;
  phone: string;
  telegramId: string | null;
  visitCount: number;
  lastVisit: string;
}

interface ClientDetail {
  name: string;
  phone: string;
  telegramId: string | null;
  visits: { date: string; time: string; serviceName: string; price: number }[];
  note: string;
}

const MONTH_NAMES = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export default function MasterClientsPage() {
  const [masterId, setMasterId] = useState<number | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) return;
    tg.ready();
    fetch("/api/master/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.valid) setMasterId(d.master.id); });
  }, []);

  const fetchClients = useCallback(async () => {
    if (!masterId) return;
    const res = await fetch(`/api/master/clients?masterId=${masterId}`);
    const d = await res.json();
    setClients(d.clients || []);
    setLoading(false);
  }, [masterId]);

  useEffect(() => { if (masterId) fetchClients(); }, [masterId, fetchClients]);

  const openDetail = async (client: Client) => {
    if (!masterId) return;
    setDetailLoading(true);
    setDetail(null);
    const res = await fetch(`/api/master/clients/detail?masterId=${masterId}&phone=${encodeURIComponent(client.phone)}`);
    const d = await res.json();
    setDetail(d);
    setNoteText(d.note || "");
    setDetailLoading(false);
  };

  const saveNote = async () => {
    if (!masterId || !detail) return;
    setNoteSaving(true);
    await fetch("/api/master/clients/note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masterId, clientIdentifier: detail.phone, note: noteText }),
    });
    setNoteSaving(false);
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  if (detail || detailLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] pb-20">
        <div className="px-5 pt-5 pb-3">
          <button onClick={() => setDetail(null)} className="text-sm" style={{ color: "#B2223C" }}>← Назад</button>
        </div>

        {detailLoading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Загрузка...</div>
        ) : detail ? (
          <>
            <div className="px-5 mb-4">
              <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="text-base font-bold text-gray-900">{detail.name}</div>
                <div className="text-xs text-gray-500 mt-1">{detail.phone}</div>
                <div className="flex gap-2 mt-3">
                  <a
                    href={`tel:${detail.phone}`}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white text-center"
                    style={{ background: "#B2223C" }}
                  >
                    Позвонить
                  </a>
                  {detail.telegramId && (
                    <a
                      href={`tg://user?id=${detail.telegramId}`}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold text-center border"
                      style={{ color: "#B2223C", borderColor: "#B2223C" }}
                    >
                      Telegram
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 mb-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Заметки</h2>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onBlur={saveNote}
                placeholder="Заметка о клиенте..."
                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-700 resize-none"
                rows={3}
              />
              {noteSaving && <div className="text-[10px] text-gray-400 mt-1">Сохранение...</div>}
            </div>

            <div className="px-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">История визитов ({detail.visits.length})</h2>
              <div className="flex flex-col gap-2">
                {detail.visits.map((v, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-900">{v.serviceName}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{formatDate(v.date)} · {v.time}</div>
                    </div>
                    <div className="text-xs font-semibold text-gray-700">{v.price.toLocaleString()} ₽</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <MasterTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <div className="px-5 pt-5 pb-2">
        <h1 className="text-lg font-bold text-gray-900">Клиенты</h1>
      </div>

      <div className="px-5 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени или телефону..."
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-700"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Клиентов не найдено</div>
      ) : (
        <div className="px-5 flex flex-col gap-2">
          {filtered.map((c, i) => (
            <button
              key={i}
              onClick={() => openDetail(c)}
              className="bg-white rounded-xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex justify-between items-center text-left w-full"
            >
              <div>
                <div className="text-sm font-medium text-gray-900">{c.name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{c.phone}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold" style={{ color: "#B2223C" }}>{c.visitCount} визитов</div>
                <div className="text-[10px] text-gray-400">{formatDate(c.lastVisit)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <MasterTabBar />
    </div>
  );
}
