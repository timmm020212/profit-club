"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { ru } from "date-fns/locale";
import "react-day-picker/dist/style.css";

interface Service {
  id: number;
  name: string;
  description?: string | null;
  price?: string | null;
  duration?: number | string | null;
  executorRole?: string | null;
}

interface Master {
  id: number;
  fullName: string;
  specialization?: string | null;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

const GRAD = "from-[#B2223C] to-[#e8556e]";
const FONT = "var(--font-montserrat)";

const AVATAR_GRADS = [
  "from-violet-600 to-purple-800",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-700",
  "from-teal-500 to-cyan-700",
  "from-indigo-500 to-blue-700",
];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function displayDate(d: Date) {
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });
}

const STEPS = ["Мастер", "Дата", "Время", "Данные"];

interface Variant {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface Props {
  service: Service;
  onClose: () => void;
  telegramUser?: {
    telegramId: string;
    name: string;
    phone: string;
  } | null;
  variant?: Variant | null;
}

export default function BookingModal({ service, onClose, telegramUser, variant }: Props) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(1);

  const [masters, setMasters] = useState<Master[]>([]);
  const [mastersLoading, setMastersLoading] = useState(true);
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [clientName, setClientName] = useState(telegramUser?.name || "");
  const [clientPhone, setClientPhone] = useState(telegramUser?.phone || "");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function validateName(v: string) {
    if (!v.trim()) return "Введите ваше имя";
    if (v.trim().length < 2) return "Имя слишком короткое";
    return "";
  }
  function validatePhone(v: string) {
    if (!v.trim()) return "Введите номер телефона";
    if (!/^(\+7|7|8)?[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/.test(v.trim())) return "Введите корректный номер";
    return "";
  }

  // Lock body scroll
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Load masters
  useEffect(() => {
    fetch("/api/masters")
      .then((r) => r.json())
      .then((data: Master[]) => {
        if (service.executorRole) {
          const role = service.executorRole.trim().toLowerCase();
          const filtered = data.filter((m) => {
            const tokens = String(m.specialization || "").split(",").map((s) => s.trim().toLowerCase());
            return tokens.some(t => t === role || t.includes(role) || role.includes(t));
          });
          setMasters(filtered);
        } else {
          setMasters(data);
        }
      })
      .catch(() => {})
      .finally(() => setMastersLoading(false));
  }, [service.executorRole]);

  const loadSlots = useCallback(async () => {
    if (!selectedMaster || !selectedDate) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const variantParam = variant ? `&variantId=${variant.id}` : "";
      const res = await fetch(
        `/api/available-slots?masterId=${selectedMaster.id}&serviceId=${service.id}&date=${formatDate(selectedDate)}${variantParam}`
      );
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } catch { setSlots([]); }
    finally { setSlotsLoading(false); }
  }, [selectedMaster, selectedDate, service.id, variant]);

  useEffect(() => {
    if (step === 3) loadSlots();
  }, [step, loadSlots]);

  async function handleSubmit() {
    const ne = validateName(clientName);
    const pe = validatePhone(clientPhone);
    setNameError(ne);
    setPhoneError(pe);
    if (ne || pe || !selectedMaster || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: selectedMaster.id,
          serviceId: service.id,
          variantId: variant?.id || null,
          appointmentDate: formatDate(selectedDate),
          startTime: selectedSlot.startTime,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientTelegramId: telegramUser?.telegramId || (typeof window !== "undefined" ? localStorage.getItem("profit_club_telegram_id") || undefined : undefined),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setStep(5);
    } catch (e: any) {
      setSubmitError(e.message || "Ошибка. Попробуйте снова.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md bg-[#0e0e14] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-white/6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1" style={{ fontFamily: FONT }}>
                {service.name}{variant ? ` · ${variant.name}` : ""}
              </p>
              <h2 className="text-lg font-semibold text-white leading-tight" style={{ fontFamily: FONT, fontWeight: 600 }}>
                {step === 1 && "Выберите мастера"}
                {step === 2 && "Выберите дату"}
                {step === 3 && "Выберите время"}
                {step === 4 && "Ваши данные"}
                {step === 5 && "Готово!"}
              </h2>
            </div>
            {step < 5 && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all flex-shrink-0 mt-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Step progress — expanding pills */}
          {step < 5 && (() => {
            const stepValues: (string | null)[] = [
              selectedMaster ? selectedMaster.fullName.split(" ")[0] : null,
              selectedDate ? selectedDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : null,
              selectedSlot ? selectedSlot.startTime : null,
              null,
            ];
            return (
              <div className="flex items-end gap-2 mt-4">
                {STEPS.map((label, i) => {
                  const n = (i + 1) as Step;
                  const done = step > n;
                  const active = step === n;
                  const val = stepValues[i];

                  if (done) {
                    return (
                      <button
                        key={n}
                        onClick={() => setStep(n)}
                        className="step-pill group relative flex-1 rounded-xl overflow-hidden"
                        style={{
                          background: "linear-gradient(135deg, rgba(178,34,60,0.18) 0%, rgba(232,85,110,0.10) 100%)",
                          border: "1px solid rgba(178,34,60,0.30)",
                          padding: "6px 10px 7px",
                        }}
                      >
                        <div className="step-pill-in flex flex-col items-start gap-0.5">
                          <span
                            className="text-[9px] font-semibold uppercase tracking-widest leading-none"
                            style={{ fontFamily: FONT, color: "rgba(232,85,110,1)" }}
                          >
                            {label}
                          </span>
                          <span
                            className="text-[13px] font-semibold leading-tight capitalize truncate w-full text-left group-hover:text-white transition-colors"
                            style={{ fontFamily: FONT, color: "rgba(255,255,255,0.95)", maxWidth: "100%" }}
                          >
                            {val ?? "—"}
                          </span>
                        </div>
                        {/* hover edit hint */}
                        <span className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-3 h-3" style={{ color: "rgba(232,85,110,0.7)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.586-6.586a2 2 0 012.828 2.828L11.828 13.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                          </svg>
                        </span>
                        {/* bottom glow line */}
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#B2223C] to-[#e8556e] opacity-60 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  }

                  if (active) {
                    return (
                      <div
                        key={n}
                        className="relative flex-[1.4] rounded-xl overflow-hidden"
                        style={{ padding: "6px 10px 7px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}
                      >
                        <span className="text-[9px] font-medium uppercase tracking-widest leading-none block mb-0.5"
                          style={{ fontFamily: FONT, color: "rgba(255,255,255,0.30)" }}>
                          {label}
                        </span>
                        <span className="text-[13px] font-semibold leading-tight text-white/50 block" style={{ fontFamily: FONT }}>···</span>
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#B2223C] to-[#e8556e]" />
                        <span className="absolute bottom-0 right-1 w-1.5 h-1.5 rounded-full bg-white/70 -translate-y-[-3px] shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={n}
                      className="flex-1 rounded-xl"
                      style={{ height: "32px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}
                    />
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4 booking-modal-scroll">

          {/* ── STEP 1: Master ── */}
          {step === 1 && (
            <div className="animate-modal-in">
              {mastersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-7 h-7 rounded-full border-2 border-[#B2223C]/30 border-t-[#B2223C] animate-spin" />
                </div>
              ) : masters.length === 0 ? (
                <p className="text-center text-white/30 py-8 text-sm">Мастера не найдены</p>
              ) : (
                <div className="space-y-2">
                  {masters.map((master, idx) => {
                    const sel = selectedMaster?.id === master.id;
                    return (
                      <button
                        key={master.id}
                        onClick={() => setSelectedMaster(master)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 ${
                          sel
                            ? "border-[#B2223C]/50 bg-[#B2223C]/10 shadow-md shadow-[#B2223C]/10"
                            : "border-white/7 bg-white/3 hover:border-white/12 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AVATAR_GRADS[idx % AVATAR_GRADS.length]} flex items-center justify-center text-xs font-bold flex-shrink-0 shadow`}>
                            {getInitials(master.fullName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white" style={{ fontFamily: FONT }}>{master.fullName}</p>
                            {master.specialization && (
                              <p className="text-xs text-white/35 mt-0.5 truncate" style={{ fontFamily: FONT, fontWeight: 300 }}>{master.specialization}</p>
                            )}
                          </div>
                          {sel && (
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${GRAD} flex items-center justify-center flex-shrink-0`}>
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Date ── */}
          {step === 2 && (
            <div className="animate-modal-in flex flex-col items-center">
              <div className="w-full booking-calendar-modal flex justify-center">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ru}
                  disabled={{ before: new Date() }}
                  startMonth={new Date()}
                  endMonth={new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)}
                  showOutsideDays={false}
                />
              </div>
              {selectedDate && (
                <div className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#B2223C]/10 border border-[#B2223C]/20 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-[#e8556e] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-white/75 capitalize" style={{ fontFamily: FONT }}>{displayDate(selectedDate)}</span>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Time ── */}
          {step === 3 && (
            <div className="animate-modal-in">
              {slotsLoading ? (
                <div className="flex flex-col items-center py-10 gap-2.5">
                  <div className="w-7 h-7 rounded-full border-2 border-[#B2223C]/30 border-t-[#B2223C] animate-spin" />
                  <p className="text-white/25 text-xs">Загружаем расписание...</p>
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/30 text-sm mb-1">Нет свободного времени</p>
                  <p className="text-white/18 text-xs mb-5">Попробуйте другую дату</p>
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-white/50 text-xs hover:text-white/70 transition-all"
                    style={{ fontFamily: FONT }}
                  >← Изменить дату</button>
                </div>
              ) : (
                <>
                  {[
                    { label: "Утро", from: 0, to: 12, icon: (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3v1M12 20v1M4.22 4.22l.7.7M19.08 19.08l.7.7M3 12h1M20 12h1M4.92 19.08l.7-.7M19.08 4.92l.7-.7"/>
                        <circle cx="12" cy="12" r="4"/>
                      </svg>
                    )},
                    { label: "День", from: 12, to: 17, icon: (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5"/>
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                      </svg>
                    )},
                    { label: "Вечер", from: 17, to: 24, icon: (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                      </svg>
                    )},
                  ].map(({ label, icon, from, to }) => {
                    const group = slots.filter((s) => {
                      const h = parseInt(s.startTime.split(":")[0]);
                      return h >= from && h < to;
                    });
                    if (!group.length) return null;
                    return (
                      <div key={label} className="mb-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-white/40">{icon}</span>
                          <span className="text-[10px] font-medium text-white/35 uppercase tracking-widest" style={{ fontFamily: FONT }}>{label}</span>
                          <div className="flex-1 h-px bg-white/6" />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.map((slot) => {
                            const sel = selectedSlot?.startTime === slot.startTime;
                            return (
                              <button
                                key={slot.startTime}
                                onClick={() => setSelectedSlot(slot)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                                  sel
                                    ? `bg-gradient-to-r ${GRAD} text-white shadow-md shadow-[#B2223C]/20 scale-105`
                                    : "bg-white/5 border border-white/8 text-white/65 hover:bg-white/9 hover:text-white"
                                }`}
                                style={{ fontFamily: FONT }}
                              >
                                {slot.startTime}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ── STEP 4: Details ── */}
          {step === 4 && (
            <div className="animate-modal-in space-y-4">
              <div>
                <label className="block text-[10px] text-white/35 mb-1.5 ml-0.5 uppercase tracking-wider" style={{ fontFamily: FONT }}>Ваше имя</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => { setClientName(e.target.value); if (nameError) setNameError(validateName(e.target.value)); }}
                  onBlur={(e) => setNameError(validateName(e.target.value))}
                  placeholder="Как вас зовут?"
                  className="w-full border rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
                  style={{ fontFamily: FONT, color: '#ffffff', background: 'rgba(255,255,255,0.06)', caretColor: '#e8556e', borderColor: nameError ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)' }}
                />
                {nameError && <p className="mt-1 ml-0.5 text-[11px] text-red-400">{nameError}</p>}
              </div>
              <div>
                <label className="block text-[10px] text-white/35 mb-1.5 ml-0.5 uppercase tracking-wider" style={{ fontFamily: FONT }}>Телефон</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => { setClientPhone(e.target.value); if (phoneError) setPhoneError(validatePhone(e.target.value)); }}
                  onBlur={(e) => setPhoneError(validatePhone(e.target.value))}
                  placeholder="+7 (___) ___-__-__"
                  className="w-full border rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
                  style={{ fontFamily: FONT, color: '#ffffff', background: 'rgba(255,255,255,0.06)', caretColor: '#e8556e', borderColor: phoneError ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)' }}
                />
                {phoneError && <p className="mt-1 ml-0.5 text-[11px] text-red-400">{phoneError}</p>}
              </div>
              {submitError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/15 rounded-xl px-3 py-2.5">{submitError}</p>
              )}
            </div>
          )}

          {/* ── STEP 5: Success ── */}
          {step === 5 && (
            <div className="animate-modal-in flex flex-col items-center text-center py-4">
              <div className="relative w-16 h-16 mb-5">
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${GRAD} opacity-20 animate-ping`} />
                <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${GRAD} flex items-center justify-center shadow-xl shadow-[#B2223C]/30`}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: FONT, fontWeight: 700 }}>Запись оформлена!</h3>
              <p className="text-xs text-white/35 mb-6 leading-relaxed max-w-[220px]" style={{ fontFamily: FONT, fontWeight: 300 }}>
                Ждём вас в Profit Club. Напомним накануне визита.
              </p>
              <div className="w-full p-4 rounded-2xl bg-white/3 border border-white/8 text-left space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Услуга</p>
                    <p className="text-xs text-white/75" style={{ fontFamily: FONT }}>{service.name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Мастер</p>
                    <p className="text-xs text-white/75" style={{ fontFamily: FONT }}>{selectedMaster?.fullName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Дата</p>
                    <p className="text-xs text-white/75 capitalize" style={{ fontFamily: FONT }}>
                      {selectedDate?.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Время</p>
                    <p className="text-xs text-white/75" style={{ fontFamily: FONT }}>{selectedSlot?.startTime} — {selectedSlot?.endTime}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  const tg = (window as any).Telegram?.WebApp;
                  if (tg && telegramUser) {
                    tg.close();
                  } else {
                    onClose();
                  }
                }}
                className={`mt-5 w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all shadow-lg shadow-[#B2223C]/20 hover:shadow-[#B2223C]/35 hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r ${GRAD}`}
                style={{ fontFamily: FONT }}
              >
                {telegramUser ? "Закрыть" : "В главное меню"}
              </button>
            </div>
          )}
        </div>

        {/* Footer button */}
        {step < 5 && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-white/6 bg-[#0e0e14]">
            <button
              disabled={
                (step === 1 && !selectedMaster) ||
                (step === 2 && !selectedDate) ||
                (step === 3 && !selectedSlot) ||
                (step === 4 && (!clientName.trim() || !clientPhone.trim() || submitting))
              }
              onClick={() => {
                if (step === 4) handleSubmit();
                else setStep((s) => (s + 1) as Step);
              }}
              className={`w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                (step === 1 && selectedMaster) ||
                (step === 2 && selectedDate) ||
                (step === 3 && selectedSlot) ||
                (step === 4 && clientName.trim() && clientPhone.trim() && !submitting)
                  ? `bg-gradient-to-r ${GRAD} text-white shadow-lg shadow-[#B2223C]/20 hover:shadow-[#B2223C]/35 hover:scale-[1.01] active:scale-[0.99]`
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }`}
              style={{ fontFamily: FONT }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Оформляем...
                </>
              ) : step === 4 ? "Подтвердить запись" : "Продолжить"}
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes modal-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-modal-in { animation: modal-in 0.25s ease-out both; }
        .booking-modal-scroll::-webkit-scrollbar { width: 3px; }
        .booking-modal-scroll::-webkit-scrollbar-track { background: transparent; }
        .booking-modal-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

        @keyframes pill-in {
          0%   { opacity: 0; transform: scaleX(0.6) translateY(4px); }
          60%  { opacity: 1; transform: scaleX(1.03) translateY(-1px); }
          100% { opacity: 1; transform: scaleX(1) translateY(0); }
        }
        @keyframes pill-text-in {
          0%   { opacity: 0; transform: translateY(5px); }
          50%  { opacity: 0; }
          100% { opacity: 1; transform: translateY(0); }
        }
        .step-pill {
          transform-origin: left center;
          animation: pill-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .step-pill-in {
          animation: pill-text-in 0.45s ease both;
        }

        .booking-calendar-modal .rdp {
          --rdp-accent-color: #B2223C;
          --rdp-background-color: rgba(178,34,60,0.12);
          color: white;
          margin: 0 auto;
        }
        .booking-calendar-modal .rdp-months { justify-content: center; }
        .booking-calendar-modal .rdp-day_selected,
        .booking-calendar-modal .rdp-day_selected:focus-visible,
        .booking-calendar-modal .rdp-day_selected:hover {
          background: linear-gradient(135deg, #B2223C, #e8556e);
          color: white;
          font-weight: 600;
        }
        .booking-calendar-modal .rdp-day:hover:not(.rdp-day_disabled):not(.rdp-day_selected) {
          background: rgba(255,255,255,0.07);
          color: white;
        }
        .booking-calendar-modal .rdp-day_today:not(.rdp-day_selected) {
          font-weight: 700;
          color: #e8556e;
        }
        .booking-calendar-modal .rdp-day_disabled { opacity: 0.18; }
        .booking-calendar-modal .rdp-caption_label {
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: capitalize;
          font-family: var(--font-montserrat);
        }
        .booking-calendar-modal .rdp-head_cell {
          color: rgba(255,255,255,0.28);
          font-size: 0.7rem;
          font-weight: 400;
          text-transform: capitalize;
          font-family: var(--font-montserrat);
        }
        .booking-calendar-modal .rdp-nav_button {
          color: rgba(255,255,255,0.45);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
        }
        .booking-calendar-modal .rdp-nav_button:hover {
          color: white;
          background: rgba(255,255,255,0.08);
        }
        .booking-calendar-modal .rdp-day {
          border-radius: 8px;
          color: rgba(255,255,255,0.7);
          transition: all 0.15s;
          font-family: var(--font-montserrat);
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );

  return createPortal(modal, document.body);
}
