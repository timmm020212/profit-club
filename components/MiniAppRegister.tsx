"use client";

import { useState, useEffect } from "react";

const FONT = "var(--font-montserrat)";

export default function MiniAppRegister() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [initData, setInitData] = useState("");

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      try { tg.setHeaderColor("#09090D"); } catch {}
      try { tg.setBackgroundColor("#09090D"); } catch {}
      if (tg.initData) setInitData(tg.initData);
      if (tg.initDataUnsafe?.user?.first_name) {
        setName(tg.initDataUnsafe.user.first_name);
      }
    }
  }, []);

  function validateName(v: string) {
    if (!v.trim()) return "Введите ваше имя";
    if (v.trim().length < 2) return "Имя слишком короткое";
    return "";
  }

  function validatePhone(v: string) {
    if (!v.trim()) return "Введите номер телефона";
    if (!/^(\+7|7|8)?[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/.test(v.trim()))
      return "Введите корректный номер";
    return "";
  }

  async function handleSubmit() {
    const ne = validateName(name);
    const pe = validatePhone(phone);
    setNameError(ne);
    setPhoneError(pe);
    if (ne || pe) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/miniapp/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
      setSuccess(true);
      setTimeout(() => {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) tg.close();
      }, 2000);
    } catch (e: any) {
      setSubmitError(e.message || "Ошибка. Попробуйте снова.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#B2223C] to-[#e8556e] flex items-center justify-center shadow-xl shadow-[#B2223C]/30">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white" style={{ fontFamily: FONT }}>
          Регистрация завершена!
        </h2>
        <p className="text-sm text-white/40" style={{ fontFamily: FONT }}>
          Возвращайтесь в чат бота
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-5 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white mb-1" style={{ fontFamily: FONT }}>
          Регистрация
        </h1>
        <p className="text-sm text-white/40" style={{ fontFamily: FONT }}>
          Заполните данные для записи в Profit Club
        </p>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-[10px] text-white/35 mb-1.5 ml-0.5 uppercase tracking-wider" style={{ fontFamily: FONT }}>
            Ваше имя
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); if (nameError) setNameError(validateName(e.target.value)); }}
            onBlur={(e) => setNameError(validateName(e.target.value))}
            placeholder="Как вас зовут?"
            className="w-full border rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
            style={{ fontFamily: FONT, color: "#fff", background: "rgba(255,255,255,0.06)", caretColor: "#e8556e", borderColor: nameError ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.1)" }}
          />
          {nameError && <p className="mt-1 ml-0.5 text-[11px] text-red-400">{nameError}</p>}
        </div>

        <div>
          <label className="block text-[10px] text-white/35 mb-1.5 ml-0.5 uppercase tracking-wider" style={{ fontFamily: FONT }}>
            Телефон
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(validatePhone(e.target.value)); }}
            onBlur={(e) => setPhoneError(validatePhone(e.target.value))}
            placeholder="+7 (___) ___-__-__"
            className="w-full border rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
            style={{ fontFamily: FONT, color: "#fff", background: "rgba(255,255,255,0.06)", caretColor: "#e8556e", borderColor: phoneError ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.1)" }}
          />
          {phoneError && <p className="mt-1 ml-0.5 text-[11px] text-red-400">{phoneError}</p>}
        </div>

        {submitError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/15 rounded-xl px-3 py-2.5">
            {submitError}
          </p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all mt-6 flex items-center justify-center gap-2"
        style={{
          fontFamily: FONT,
          background: submitting ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #B2223C, #d4395a)",
          boxShadow: submitting ? "none" : "0 2px 12px rgba(178,34,60,0.25)",
        }}
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Регистрация...
          </>
        ) : "Зарегистрироваться"}
      </button>
    </div>
  );
}
