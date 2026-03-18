"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import { ru } from "date-fns/locale";
import "react-day-picker/dist/style.css";

interface Service {
  id: number;
  name: string;
  description: string;
  price?: string | null;
  duration?: number | null;
  imageUrl?: string | null;
  category?: string | null;
  executorRole?: string | null;
}

interface Master {
  id: number;
  fullName: string;
  specialization?: string | null;
  imageUrl?: string | null;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = ["Мастер", "Дата", "Время", "Данные", "Готово"];

const GRAD = "from-[#B2223C] to-[#e8556e]";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const AVATAR_GRADS = [
  "from-violet-600 to-purple-800",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-700",
  "from-teal-500 to-cyan-700",
  "from-indigo-500 to-blue-700",
];

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function displayDate(d: Date) {
  return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}

export default function BookingFlow({ service }: { service: Service }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [masters, setMasters] = useState<Master[]>([]);
  const [mastersLoading, setMastersLoading] = useState(true);
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);

  // Step 2
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Step 3
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Step 4
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
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

  // Step 5
  const [appointmentId, setAppointmentId] = useState<number | null>(null);

  // Load masters
  useEffect(() => {
    fetch("/api/masters")
      .then((r) => r.json())
      .then((data: Master[]) => {
        // Filter by executorRole if set
        if (service.executorRole) {
          const role = service.executorRole.trim().toLowerCase();
          const filtered = data.filter((m) =>
            String(m.specialization || "")
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .includes(role)
          );
          setMasters(filtered.length > 0 ? filtered : data);
        } else {
          setMasters(data);
        }
      })
      .catch(() => {})
      .finally(() => setMastersLoading(false));
  }, [service.executorRole]);

  // Load slots when master + date selected
  const loadSlots = useCallback(async () => {
    if (!selectedMaster || !selectedDate) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const res = await fetch(
        `/api/available-slots?masterId=${selectedMaster.id}&serviceId=${service.id}&date=${formatDate(selectedDate)}`
      );
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedMaster, selectedDate, service.id]);

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
          appointmentDate: formatDate(selectedDate),
          startTime: selectedSlot.startTime,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка записи");
      setAppointmentId(data.id || null);
      setStep(5);
    } catch (e: any) {
      setSubmitError(e.message || "Ошибка. Попробуйте снова.");
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (step === 1) router.back();
    else setStep((s) => (s - 1) as Step);
  }

  const progress = ((step - 1) / 4) * 100;

  return (
    <div className="min-h-screen bg-[#09090D] text-white relative overflow-hidden">
      {/* Ambient bg blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#B2223C]/8 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-[#B2223C]/5 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] rounded-full bg-purple-900/10 blur-[80px]" />
      </div>

      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-[#09090D]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={goBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Steps */}
          {step < 5 && (
            <div className="flex items-center gap-1.5 flex-1">
              {STEP_LABELS.slice(0, 4).map((label, i) => {
                const n = i + 1;
                const active = step === n;
                const done = step > n;
                return (
                  <div key={n} className="flex items-center gap-1.5">
                    <div className={`flex items-center gap-1.5 transition-all duration-300 ${active ? "opacity-100" : done ? "opacity-60" : "opacity-25"}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all duration-300 ${done ? `bg-gradient-to-br ${GRAD}` : active ? "bg-white/15 ring-1 ring-white/30" : "bg-white/5"}`}>
                        {done ? (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : n}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${active ? "text-white" : "text-white/50"}`}>{label}</span>
                    </div>
                    {i < 3 && <div className={`w-4 h-px transition-all duration-500 ${done ? `bg-gradient-to-r ${GRAD}` : "bg-white/10"}`} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Service name */}
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-white/40 font-light">услуга</p>
            <p className="text-sm text-white/80 font-medium leading-tight max-w-[140px] truncate" style={{ fontFamily: "var(--font-montserrat)" }}>
              {service.name}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {step < 5 && (
          <div className="h-0.5 bg-white/5">
            <div
              className={`h-full bg-gradient-to-r ${GRAD} transition-all duration-700 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 relative z-10">

        {/* ── STEP 1: Master ── */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
              Выберите мастера
            </h1>
            <p className="text-white/40 text-sm mb-8" style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300 }}>
              {service.duration ? `Длительность — ${service.duration} мин` : ""}
              {service.price ? ` · ${service.price}` : ""}
            </p>

            {mastersLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-[#B2223C]/30 border-t-[#B2223C] animate-spin" />
              </div>
            ) : masters.length === 0 ? (
              <div className="text-center py-16 text-white/30">Мастера не найдены</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {masters.map((master, idx) => {
                  const selected = selectedMaster?.id === master.id;
                  return (
                    <button
                      key={master.id}
                      onClick={() => { setSelectedMaster(master); }}
                      className={`group relative text-left p-4 rounded-2xl border transition-all duration-300 ${
                        selected
                          ? "border-[#B2223C]/60 bg-[#B2223C]/10 shadow-lg shadow-[#B2223C]/10"
                          : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${AVATAR_GRADS[idx % AVATAR_GRADS.length]} flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg`}>
                          {getInitials(master.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-sm leading-tight" style={{ fontFamily: "var(--font-montserrat)" }}>
                            {master.fullName}
                          </p>
                          {master.specialization && (
                            <p className="text-xs text-white/40 mt-0.5 truncate" style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300 }}>
                              {master.specialization}
                            </p>
                          )}
                        </div>
                        {selected && (
                          <div className={`ml-auto w-5 h-5 rounded-full bg-gradient-to-br ${GRAD} flex items-center justify-center flex-shrink-0`}>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="white" viewBox="0 0 24 24">
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

            <div className="mt-8">
              <button
                disabled={!selectedMaster}
                onClick={() => setStep(2)}
                className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                  selectedMaster
                    ? `bg-gradient-to-r ${GRAD} text-white shadow-xl shadow-[#B2223C]/25 hover:shadow-[#B2223C]/40 hover:scale-[1.01] active:scale-[0.99]`
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                }`}
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Продолжить
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Date ── */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
              Выберите дату
            </h1>
            <p className="text-white/40 text-sm mb-8" style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300 }}>
              {selectedMaster?.fullName}
            </p>

            <div className="bg-white/3 border border-white/8 rounded-3xl p-4 md:p-6 flex justify-center booking-calendar">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ru}
                disabled={{ before: new Date() }}
                fromMonth={new Date()}
                toMonth={new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)}
                showOutsideDays={false}
              />
            </div>

            {selectedDate && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-[#B2223C]/10 border border-[#B2223C]/20 flex items-center gap-2.5">
                <svg className="w-4 h-4 text-[#e8556e] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-white/80 capitalize" style={{ fontFamily: "var(--font-montserrat)", fontWeight: 400 }}>
                  {displayDate(selectedDate)}
                </span>
              </div>
            )}

            <div className="mt-6">
              <button
                disabled={!selectedDate}
                onClick={() => setStep(3)}
                className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                  selectedDate
                    ? `bg-gradient-to-r ${GRAD} text-white shadow-xl shadow-[#B2223C]/25 hover:shadow-[#B2223C]/40 hover:scale-[1.01] active:scale-[0.99]`
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                }`}
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Выбрать время
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Time ── */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
              Выберите время
            </h1>
            <p className="text-white/40 text-sm mb-8 capitalize" style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300 }}>
              {selectedDate ? displayDate(selectedDate) : ""}
            </p>

            {slotsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-[#B2223C]/30 border-t-[#B2223C] animate-spin" />
                <p className="text-white/30 text-sm">Загружаем расписание...</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-white/30 text-sm mb-2">Нет свободного времени</p>
                <p className="text-white/20 text-xs mb-6">Выберите другую дату или мастера</p>
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:border-white/20 hover:text-white/80 transition-all"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Изменить дату
                </button>
              </div>
            ) : (
              <>
                {/* Group by period */}
                {[
                  { label: "Утро", icon: "🌅", from: 0, to: 12 },
                  { label: "День", icon: "☀️", from: 12, to: 17 },
                  { label: "Вечер", icon: "🌆", from: 17, to: 24 },
                ].map(({ label, icon, from, to }) => {
                  const group = slots.filter((s) => {
                    const h = parseInt(s.startTime.split(":")[0]);
                    return h >= from && h < to;
                  });
                  if (group.length === 0) return null;
                  return (
                    <div key={label} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">{icon}</span>
                        <span className="text-xs font-medium text-white/40 uppercase tracking-widest" style={{ fontFamily: "var(--font-montserrat)" }}>
                          {label}
                        </span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.map((slot) => {
                          const sel = selectedSlot?.startTime === slot.startTime;
                          return (
                            <button
                              key={slot.startTime}
                              onClick={() => setSelectedSlot(slot)}
                              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                sel
                                  ? `bg-gradient-to-r ${GRAD} text-white shadow-lg shadow-[#B2223C]/25 scale-105`
                                  : "bg-white/5 border border-white/8 text-white/70 hover:bg-white/10 hover:border-white/15 hover:text-white"
                              }`}
                              style={{ fontFamily: "var(--font-montserrat)" }}
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

            {slots.length > 0 && (
              <div className="mt-4">
                <button
                  disabled={!selectedSlot}
                  onClick={() => setStep(4)}
                  className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                    selectedSlot
                      ? `bg-gradient-to-r ${GRAD} text-white shadow-xl shadow-[#B2223C]/25 hover:shadow-[#B2223C]/40 hover:scale-[1.01] active:scale-[0.99]`
                      : "bg-white/5 text-white/20 cursor-not-allowed"
                  }`}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  Продолжить
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Details ── */}
        {step === 4 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-playfair)" }}>
              Ваши данные
            </h1>
            <p className="text-white/40 text-sm mb-8" style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300 }}>
              Почти готово — осталось заполнить форму
            </p>

            {/* Summary strip */}
            <div className="mb-6 p-4 rounded-2xl bg-white/3 border border-white/8 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Мастер</p>
                <p className="text-xs text-white/80 font-medium" style={{ fontFamily: "var(--font-montserrat)" }}>
                  {selectedMaster?.fullName.split(" ")[0]}
                </p>
              </div>
              <div className="border-x border-white/8">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Дата</p>
                <p className="text-xs text-white/80 font-medium capitalize" style={{ fontFamily: "var(--font-montserrat)" }}>
                  {selectedDate?.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Время</p>
                <p className="text-xs text-white/80 font-medium" style={{ fontFamily: "var(--font-montserrat)" }}>
                  {selectedSlot?.startTime}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/40 mb-1.5 ml-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                  Ваше имя
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => { setClientName(e.target.value); if (nameError) setNameError(validateName(e.target.value)); }}
                  onBlur={(e) => setNameError(validateName(e.target.value))}
                  placeholder="Как к вам обращаться?"
                  className="w-full border rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
                  style={{ fontFamily: "var(--font-montserrat)", color: '#ffffff', background: 'rgba(255,255,255,0.06)', caretColor: '#e8556e', borderColor: nameError ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)' }}
                />
                {nameError && <p className="mt-1.5 ml-1 text-xs text-red-400" style={{ fontFamily: "var(--font-montserrat)" }}>{nameError}</p>}
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5 ml-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                  Телефон
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => { setClientPhone(e.target.value); if (phoneError) setPhoneError(validatePhone(e.target.value)); }}
                  onBlur={(e) => setPhoneError(validatePhone(e.target.value))}
                  placeholder="+7 (___) ___-__-__"
                  className="w-full border rounded-xl px-4 py-3.5 text-sm outline-none transition-all"
                  style={{ fontFamily: "var(--font-montserrat)", color: '#ffffff', background: 'rgba(255,255,255,0.06)', caretColor: '#e8556e', borderColor: phoneError ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)' }}
                />
                {phoneError && <p className="mt-1.5 ml-1 text-xs text-red-400" style={{ fontFamily: "var(--font-montserrat)" }}>{phoneError}</p>}
              </div>
            </div>

            {submitError && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {submitError}
              </div>
            )}

            <div className="mt-8">
              <button
                disabled={!clientName.trim() || !clientPhone.trim() || submitting}
                onClick={handleSubmit}
                className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                  clientName.trim() && clientPhone.trim() && !submitting
                    ? `bg-gradient-to-r ${GRAD} text-white shadow-xl shadow-[#B2223C]/25 hover:shadow-[#B2223C]/40 hover:scale-[1.01] active:scale-[0.99]`
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                }`}
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Оформляем...
                  </>
                ) : (
                  "Записаться"
                )}
              </button>

              <p className="text-center text-xs text-white/20 mt-3" style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300 }}>
                Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 5: Success ── */}
        {step === 5 && (
          <div className="animate-fade-in flex flex-col items-center text-center pt-8">
            {/* Animated check */}
            <div className="relative w-24 h-24 mb-8">
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${GRAD} opacity-20 animate-ping`} />
              <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${GRAD} flex items-center justify-center shadow-2xl shadow-[#B2223C]/40`}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: "var(--font-playfair)" }}>
              Запись оформлена!
            </h1>
            <p className="text-white/40 text-sm mb-10 max-w-xs leading-relaxed" style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300 }}>
              Ждём вас в Profit Club. Мы отправим напоминание накануне визита.
            </p>

            {/* Confirmation card */}
            <div className="w-full max-w-sm bg-white/3 border border-white/8 rounded-3xl overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${GRAD}`} />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AVATAR_GRADS[0]} flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                    {selectedMaster ? getInitials(selectedMaster.fullName) : "?"}
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-white/30">Мастер</p>
                    <p className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-montserrat)" }}>
                      {selectedMaster?.fullName}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                <div className="grid grid-cols-2 gap-4 text-left">
                  <div>
                    <p className="text-xs text-white/30 mb-1">Услуга</p>
                    <p className="text-sm text-white/80" style={{ fontFamily: "var(--font-montserrat)" }}>{service.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/30 mb-1">Стоимость</p>
                    <p className="text-sm text-white/80" style={{ fontFamily: "var(--font-montserrat)" }}>{service.price || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/30 mb-1">Дата</p>
                    <p className="text-sm text-white/80 capitalize" style={{ fontFamily: "var(--font-montserrat)" }}>
                      {selectedDate?.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/30 mb-1">Время</p>
                    <p className="text-sm text-white/80" style={{ fontFamily: "var(--font-montserrat)" }}>
                      {selectedSlot?.startTime} — {selectedSlot?.endTime}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 w-full max-w-sm space-y-3">
              <button
                onClick={() => router.push("/booking")}
                className={`w-full py-4 rounded-2xl font-semibold text-sm bg-gradient-to-r ${GRAD} text-white shadow-xl shadow-[#B2223C]/25 hover:shadow-[#B2223C]/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300`}
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Записаться ещё
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full py-3.5 rounded-2xl text-sm text-white/40 hover:text-white/70 transition-colors border border-white/5 hover:border-white/10"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                На главную
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.35s ease-out both; }

        /* Dark calendar styles */
        .booking-calendar .rdp {
          --rdp-accent-color: #B2223C;
          --rdp-background-color: rgba(178, 34, 60, 0.12);
          color: white;
        }
        .booking-calendar .rdp-day_selected,
        .booking-calendar .rdp-day_selected:focus-visible,
        .booking-calendar .rdp-day_selected:hover {
          background: linear-gradient(135deg, #B2223C, #e8556e);
          color: white;
          font-weight: 600;
        }
        .booking-calendar .rdp-day:hover:not(.rdp-day_disabled):not(.rdp-day_selected) {
          background: rgba(255,255,255,0.08);
          color: white;
        }
        .booking-calendar .rdp-day_today:not(.rdp-day_selected) {
          font-weight: 700;
          color: #e8556e;
          background: transparent;
        }
        .booking-calendar .rdp-day_disabled {
          opacity: 0.2;
        }
        .booking-calendar .rdp-caption_label {
          color: white;
          font-size: 1rem;
          font-weight: 600;
          text-transform: capitalize;
        }
        .booking-calendar .rdp-head_cell {
          color: rgba(255,255,255,0.3);
          font-size: 0.75rem;
          font-weight: 400;
          text-transform: capitalize;
        }
        .booking-calendar .rdp-nav_button {
          color: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
        }
        .booking-calendar .rdp-nav_button:hover {
          color: white;
          background: rgba(255,255,255,0.08);
        }
        .booking-calendar .rdp-day {
          border-radius: 10px;
          color: rgba(255,255,255,0.75);
          transition: all 0.15s;
        }
      `}</style>
    </div>
  );
}
