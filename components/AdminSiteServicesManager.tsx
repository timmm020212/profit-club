"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ServiceItem = {
  id: number;
  name: string;
  description: string;
  price: string | null;
  duration: number;
  imageUrl?: string | null;
  orderDesktop?: number;
  orderMobile?: number;
  badgeText: string | null;
  badgeType: string | null;
  executorRole?: string | null;
};

type ServiceDraft = {
  name: string;
  description: string;
  price: string;
  duration: string;
  imageUrl: string;
  badgeText: string;
  badgeType: string;
  executorRole: string;
};

const emptyDraft: ServiceDraft = { name: "", description: "", price: "", duration: "60", imageUrl: "", badgeText: "", badgeType: "", executorRole: "" };

function toDraft(s: ServiceItem): ServiceDraft {
  return { name: s.name || "", description: s.description || "", price: s.price || "", duration: String(s.duration ?? 60), imageUrl: s.imageUrl || "", badgeText: s.badgeText || "", badgeType: s.badgeType || "", executorRole: s.executorRole || "" };
}

function normalizePayload(draft: ServiceDraft) {
  const durationNum = Number(draft.duration);
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    price: draft.price.replace(/\D+/g, "").trim() ? `${draft.price.replace(/\D+/g, "").trim()} ₽` : null,
    duration: Number.isFinite(durationNum) ? durationNum : 60,
    imageUrl: draft.imageUrl.trim() || null,
    badgeText: draft.badgeText.trim() || null,
    badgeType: draft.badgeType.trim() ? draft.badgeType.trim().toLowerCase() : null,
    executorRole: draft.executorRole.trim() || null,
  };
}

const inputCls = "w-full rounded-lg bg-[#161619] border border-white/[0.07] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/40 transition-all";

export default function AdminSiteServicesManager() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"desktop" | "mobile">("desktop");
  const [ordered, setOrdered] = useState<ServiceItem[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);

  async function loadServices() {
    try {
      setLoading(true); setError(null);
      const res = await fetch("/api/services", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось загрузить услуги");
      const list: ServiceItem[] = Array.isArray(data) ? data : [];
      setServices(list);
      const sorted = list.slice().sort((a, b) => {
        const ao = (layoutMode === "desktop" ? a.orderDesktop : a.orderMobile) ?? 0;
        const bo = (layoutMode === "desktop" ? b.orderDesktop : b.orderMobile) ?? 0;
        return ao !== bo ? ao - bo : a.id - b.id;
      });
      setOrdered(sorted);
    } catch (e: any) {
      setError(e?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadServices(); }, [layoutMode]);

  async function handleSave() {
    try {
      setSaving(true); setError(null);
      const payload = normalizePayload(draft);
      const res = editingId === "new"
        ? await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch(`/api/services/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось сохранить");
      await loadServices();
      setEditingId(null);
    } catch (e: any) {
      setError(e?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить эту услугу?")) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось удалить");
      await loadServices();
    } catch (e: any) {
      setError(e?.message || "Ошибка удаления");
    }
  }

  async function handleSaveOrder() {
    try {
      setSavingOrder(true); setError(null);
      const items = ordered.map((s, idx) => ({ id: s.id, order: idx }));
      const res = await fetch("/api/services/order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: layoutMode, items }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось сохранить порядок");
      setOrderSaved(true);
      setTimeout(() => setOrderSaved(false), 3000);
    } catch (e: any) {
      setError(e?.message || "Ошибка сохранения порядка");
    } finally {
      setSavingOrder(false);
    }
  }

  function arrayMove<T>(arr: T[], from: number, to: number): T[] {
    const next = arr.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }

  function handleDragOver(overId: number) {
    if (draggingId == null || draggingId === overId) return;
    setOrdered((prev) => {
      const from = prev.findIndex((x) => x.id === draggingId);
      const to = prev.findIndex((x) => x.id === overId);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070709] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 rounded-full border-2 border-zinc-800 border-t-violet-500 animate-spin" />
          <span className="text-sm text-zinc-500">Загрузка услуг...</span>
        </div>
      </div>
    );
  }

  // Edit / Create panel
  if (editingId !== null) {
    return (
      <div className="min-h-screen bg-[#070709]">
        <div className="mx-auto max-w-2xl px-4 lg:px-6 py-8">
          {/* Back + title */}
          <div className="flex items-center gap-3 mb-8">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.07] text-zinc-400 hover:text-white hover:bg-white/[0.09] transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-violet-400">
                {editingId === "new" ? "Создание" : "Редактирование"}
              </p>
              <h1 className="text-xl font-bold text-white">
                {editingId === "new" ? "Новая услуга" : draft.name || "Услуга"}
              </h1>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0-10a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5zm0 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-white/[0.07] bg-[#0D0D10] overflow-hidden">
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Название услуги</label>
                <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Напр: Стрижка женская" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Описание</label>
                <textarea className={`${inputCls} resize-none`} rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Подробное описание услуги..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Цена, ₽</label>
                  <input className={inputCls} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} inputMode="numeric" placeholder="1500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Длительность, мин</label>
                  <input className={inputCls} value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} inputMode="numeric" placeholder="60" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Badge текст</label>
                  <input className={inputCls} value={draft.badgeText} onChange={(e) => setDraft({ ...draft, badgeText: e.target.value })} placeholder="ХИТ" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Badge тип</label>
                  <input className={inputCls} value={draft.badgeType} onChange={(e) => setDraft({ ...draft, badgeType: e.target.value })} placeholder="accent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">URL изображения</label>
                <input className={inputCls} value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Роль исполнителя</label>
                <input className={inputCls} value={draft.executorRole} onChange={(e) => setDraft({ ...draft, executorRole: e.target.value })} placeholder="Парикмахер" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06] bg-black/20">
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-zinc-300 hover:bg-white/[0.06] transition-all">
                Отмена
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-lg shadow-violet-900/30">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Сохраняем...
                  </span>
                ) : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen bg-[#070709]">
      <div className="mx-auto max-w-screen-xl px-4 lg:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-violet-400 mb-1">Каталог</p>
            <h1 className="text-2xl font-bold text-white">Услуги</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{services.length} {services.length === 1 ? "услуга" : services.length < 5 ? "услуги" : "услуг"}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Layout mode toggle */}
            <div className="flex items-center rounded-xl border border-white/[0.07] bg-[#0D0D10] p-0.5">
              {(["desktop", "mobile"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayoutMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    layoutMode === mode ? "bg-white/[0.08] text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {mode === "desktop" ? (
                    <span className="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M1.75 2A1.75 1.75 0 0 0 0 3.75v6.5C0 11.216.784 12 1.75 12H6v1H3.75a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5H10v-1h4.25A1.75 1.75 0 0 0 16 10.25v-6.5A1.75 1.75 0 0 0 14.25 2H1.75Z" />
                      </svg>
                      Десктоп
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                        <path d="M3.25 0A2.25 2.25 0 0 0 1 2.25v11.5A2.25 2.25 0 0 0 3.25 16h9.5A2.25 2.25 0 0 0 15 13.75V2.25A2.25 2.25 0 0 0 12.75 0h-9.5ZM6.5 13.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Z" />
                      </svg>
                      Мобильный
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Save order */}
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={savingOrder}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                orderSaved
                  ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400"
                  : "bg-white/[0.04] border-white/[0.07] text-zinc-400 hover:text-white hover:bg-white/[0.08]"
              }`}
            >
              {orderSaved ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                  Сохранено
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M2.75 1a.75.75 0 0 0-.75.75v1.5c0 .414.336.75.75.75h10.5a.75.75 0 0 0 .75-.75V1.75a.75.75 0 0 0-.75-.75H2.75ZM2 6.75A.75.75 0 0 1 2.75 6h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 6.75ZM2.75 10a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" />
                  </svg>
                  Сохранить порядок
                </>
              )}
            </button>

            {/* New service */}
            <button
              type="button"
              onClick={() => { setDraft(emptyDraft); setEditingId("new"); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-all shadow-lg shadow-violet-900/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
              </svg>
              Добавить
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Services grid */}
        {ordered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-white/[0.06] bg-[#0D0D10]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.06] mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-zinc-700">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <p className="text-base font-medium text-zinc-500">Нет услуг</p>
            <p className="text-sm text-zinc-700 mt-1">Добавьте первую услугу</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ordered.map((service) => (
              <div
                key={service.id}
                draggable
                onDragStart={() => setDraggingId(service.id)}
                onDragOver={(e) => { e.preventDefault(); handleDragOver(service.id); }}
                onDragEnd={() => setDraggingId(null)}
                className={`group relative rounded-2xl border border-white/[0.07] bg-[#0D0D10] overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                  draggingId === service.id ? "opacity-40 scale-[0.98]" : "hover:border-white/[0.12]"
                }`}
              >
                {/* Image */}
                <div className="relative h-36 bg-white/[0.03] overflow-hidden">
                  {service.imageUrl ? (
                    <Image src={service.imageUrl} alt={service.name} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 text-zinc-800">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                    </div>
                  )}
                  {/* Badge */}
                  {service.badgeText && (
                    <span className="absolute top-2 left-2 inline-flex items-center rounded-lg bg-black/70 backdrop-blur-sm px-2 py-1 text-[11px] font-semibold text-white border border-white/10">
                      {service.badgeText}
                    </span>
                  )}
                  {/* Drag handle */}
                  <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-zinc-400">
                      <path d="M5.5 9.5A1.5 1.5 0 0 1 7 8h2a1.5 1.5 0 0 1 0 3H7a1.5 1.5 0 0 1-1.5-1.5ZM7 5a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 0 0-3H7Z" />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-zinc-100 leading-snug mb-1 line-clamp-2">{service.name}</h3>
                  {service.description && (
                    <p className="text-xs text-zinc-600 line-clamp-2 mb-3">{service.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {service.price && (
                      <span className="inline-flex items-center rounded-lg bg-white/[0.05] border border-white/[0.07] px-2 py-1 text-xs font-semibold text-zinc-200">
                        {service.price}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2 py-1 text-xs text-zinc-500">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
                      </svg>
                      {service.duration} мин
                    </span>
                  </div>
                </div>

                {/* Actions overlay */}
                <div className="absolute inset-x-0 bottom-0 flex gap-1.5 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200 bg-gradient-to-t from-[#0D0D10] via-[#0D0D10]/90 to-transparent pt-8">
                  <button
                    type="button"
                    onClick={() => { setDraft(toDraft(service)); setEditingId(service.id); }}
                    className="flex-1 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.13] border border-white/[0.08] text-xs font-medium text-zinc-200 transition-all"
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(service.id)}
                    className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/15 hover:bg-red-600/25 border border-red-500/15 text-red-500 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
