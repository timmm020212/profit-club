"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRegistration } from "./RegistrationProvider";

const REGISTRATION_STORAGE_KEY = "profit_club_user_registered";

export default function RegistrationModal() {
  const registration = useRegistration();
  const isOpen = registration.isOpen;
  const mode = registration.mode;
  const close = registration.close;
  const setMode = registration.setMode;
  const overlayMouseDown = useRef(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"form" | "telegram">("form");
  const [botUsername, setBotUsername] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [tgCode, setTgCode] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Читаем tg_code из URL (бот-инициированный флоу)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("tg_code");
      if (code) setTgCode(code);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setStep("form");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const p = loginPhone.trim();
    const pass = loginPassword;

    if (!p) {
      setErrors({ phone: "Телефон обязателен для заполнения" });
      return;
    }
    if (!pass) {
      setErrors({ password: "Пароль обязателен для заполнения" });
      return;
    }
    setIsLoggingIn(true);
    try {
      const response = await fetch("/api/clients/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: p, password: pass }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrors({ submit: data?.error || "Не удалось выполнить вход" });
        return;
      }

      localStorage.setItem(REGISTRATION_STORAGE_KEY, "verified");
      if (data?.name) {
        localStorage.setItem("profit_club_user_name", data.name);
      }
      if (data?.telegramId) {
        localStorage.setItem("profit_club_telegram_id", data.telegramId);
      }

      window.dispatchEvent(new Event("profit_club_auth_changed"));

      close();
    } catch (error: any) {
      setErrors({ submit: error?.message || "Ошибка при входе" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = "Имя обязательно для заполнения";
    }

    if (!phone.trim()) {
      newErrors.phone = "Телефон обязателен для заполнения";
    } else if (!/^\+?[7-8]?\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/.test(phone)) {
      newErrors.phone = "Введите корректный номер телефона";
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Введите корректный email";
    }

    if (!password) {
      newErrors.password = "Пароль обязателен для заполнения";
    } else if (password.length < 6) {
      newErrors.password = "Пароль должен быть не менее 6 символов";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Пароли не совпадают";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsVerifying(true);
    setErrors({}); // Очищаем предыдущие ошибки
    
    try {
      const response = await fetch("/api/clients/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrors({ submit: result?.error || "Ошибка при регистрации" });
        return;
      }

      console.log("Registration result:", result);
      
      // Проверяем результат регистрации
      if (result && result.success && result.botUsername && result.verificationCode) {
        setErrors({});
        setBotUsername(result.botUsername);
        setVerificationCode(result.verificationCode);

        // Если пришёл из бота — автоматически привязываем Telegram без ручного шага
        if (tgCode) {
          try {
            const verifyRes = await fetch("/api/clients/verify-telegram-code", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: tgCode, phone: phone.trim() }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.verified) {
              localStorage.setItem(REGISTRATION_STORAGE_KEY, "verified");
              localStorage.setItem("profit_club_user_name", verifyData.name || name.trim());
              if (verifyData.telegramId) {
                localStorage.setItem("profit_club_telegram_id", verifyData.telegramId);
              }
              window.dispatchEvent(new Event("profit_club_auth_changed"));
              // Убираем tg_code из URL без перезагрузки
              const url = new URL(window.location.href);
              url.searchParams.delete("tg_code");
              window.history.replaceState({}, "", url.toString());
              setTimeout(() => close(), 1500);
              setIsVerified(true);
              setStep("telegram"); // покажем успех-шаг на секунду
              return;
            }
          } catch {}
        }

        setStep("telegram");
        setIsVerified(false);
        console.log("Switched to telegram step");
      } else {
        // Если результат не содержит нужных данных
        console.error("Invalid registration result:", result);
        setErrors({ 
          submit: result?.error || "Не удалось завершить регистрацию. Попробуйте еще раз." 
        });
      }
    } catch (error: any) {
      console.error("Registration error in modal:", error);
      
      // Улучшаем отображение ошибок
      const errorMessage = error?.message || "Произошла ошибка при регистрации. Попробуйте еще раз.";
      setErrors({ submit: errorMessage });
    } finally {
      setIsVerifying(false);
    }
  };

  // Проверка статуса привязки Telegram по verificationCode
  const handleCheckTelegramStatus = async () => {
    if (!verificationCode) return;

    setIsCheckingStatus(true);
    setErrors({});

    try {
      const response = await fetch(`/api/clients/verify-status?code=${encodeURIComponent(verificationCode)}`);
      const data = await response.json();

      if (!response.ok || !data.verified) {
        setErrors({
          submit:
            data.error ||
            "Телеграм-аккаунт пока не подтверждён. Убедитесь, что вы открыли бота по ссылке с сайта и нажали Старт.",
        });
        return;
      }

      setIsVerified(true);

      // Сохраняем информацию о подтвержденной регистрации
      localStorage.setItem(REGISTRATION_STORAGE_KEY, "verified");
      localStorage.setItem("profit_club_user_name", data.name || name.trim());
      if (data.telegramId) {
        localStorage.setItem("profit_club_telegram_id", data.telegramId);
      }

      window.dispatchEvent(new Event("profit_club_auth_changed"));
      
      // Закрываем модалку через 2 секунды после подтверждения
      setTimeout(() => {
        close();
      }, 2000);
    } catch (error: any) {
      console.error("Error checking telegram status:", error);
      let errorMessage =
        error?.message ||
        "Произошла ошибка при проверке статуса. Попробуйте ещё раз или перезапустите бота.";
      setErrors({ submit: errorMessage });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Проверяем, что мы на клиенте и компонент смонтирован
  if (!isOpen || !mounted || typeof window === "undefined") {
    return null;
  }

  // Проверяем доступность document.body перед использованием createPortal
  if (typeof document === "undefined" || !document.body) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onMouseDown={(e) => {
        overlayMouseDown.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (overlayMouseDown.current && e.target === e.currentTarget) {
          close();
        }
        overlayMouseDown.current = false;
      }}
    >
      {/* Затемнение фона */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

      {/* Модальное окно */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <button
          type="button"
          onClick={close}
          className="absolute top-4 right-4 text-[#2A2A2A]/60 hover:text-[#2A2A2A] transition-colors"
          aria-label="Закрыть"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Контент */}
        <div className="p-6 md:p-8">
          {mode === "login" && step === "form" ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-medium text-[#2A2A2A] mb-2" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}>
                  Вход
                </h2>
                <p className="text-sm text-[#2A2A2A]/60" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                  Введите телефон и пароль
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2A2A2A] mb-2" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}>
                    Телефон <span className="text-[#B2223C]">*</span>
                  </label>
                  <input
                    type="tel"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className={`w-full bg-white border ${
                      errors.phone ? "border-red-500" : "border-gray-200"
                    } text-[#2A2A2A] py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B2223C] focus:border-transparent transition-all`}
                    style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}
                    placeholder="+7 (999) 123-45-67"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2A2A2A] mb-2" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}>
                    Пароль <span className="text-[#B2223C]">*</span>
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className={`w-full bg-white border ${
                      errors.password ? "border-red-500" : "border-gray-200"
                    } text-[#2A2A2A] py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B2223C] focus:border-transparent transition-all`}
                    style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}
                    placeholder="Ваш пароль"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                      {errors.password}
                    </p>
                  )}
                </div>

                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-600 text-sm" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}>
                      {errors.submit}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-[#B2223C] hover:bg-[#D13B50] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-xl text-base transition-all duration-300 shadow-md shadow-[#B2223C]/20 hover:shadow-lg hover:shadow-[#B2223C]/30 mt-6"
                  style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}
                >
                  {isLoggingIn ? "Вход..." : "Войти"}
                </button>

                <div className="text-center mt-4">
                  <span
                    className="text-sm text-[#2A2A2A]/60"
                    style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}
                  >
                    Нет аккаунта?{" "}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setErrors({});
                      setStep("form");
                    }}
                    className="text-sm text-[#B2223C] hover:text-[#D13B50] transition-colors"
                    style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}
                  >
                    Зарегистрироваться
                  </button>
                </div>
              </form>
            </>
          ) : step === "form" ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-medium text-[#2A2A2A] mb-2" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}>
                  Регистрация
                </h2>
                <p className="text-sm text-[#2A2A2A]/60" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                  Заполните данные для продолжения работы с сайтом
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Имя */}
                <div>
                  <label className="block text-sm font-medium text-[#2A2A2A] mb-2" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}>
                    Ваше имя <span className="text-[#B2223C]">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full bg-white border ${
                      errors.name ? "border-red-500" : "border-gray-200"
                    } text-[#2A2A2A] py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B2223C] focus:border-transparent transition-all`}
                    style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}
                    placeholder="Иван Иванов"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Телефон */}
                <div>
                  <label className="block text-sm font-medium text-[#2A2A2A] mb-2" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}>
                    Телефон <span className="text-[#B2223C]">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full bg-white border ${
                      errors.phone ? "border-red-500" : "border-gray-200"
                    } text-[#2A2A2A] py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B2223C] focus:border-transparent transition-all`}
                    style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}
                    placeholder="+7 (999) 123-45-67"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* Email (опционально) */}
                <div>
                  <label className="block text-sm font-medium text-[#2A2A2A] mb-2" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}>
                    Email (необязательно)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full bg-white border ${
                      errors.email ? "border-red-500" : "border-gray-200"
                    } text-[#2A2A2A] py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B2223C] focus:border-transparent transition-all`}
                    style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}
                    placeholder="example@mail.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Пароль */}
                <div>
                  <label className="block text-sm font-medium text-[#2A2A2A] mb-2" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}>
                    Пароль <span className="text-[#B2223C]">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full bg-white border ${
                      errors.password ? "border-red-500" : "border-gray-200"
                    } text-[#2A2A2A] py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B2223C] focus:border-transparent transition-all`}
                    style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}
                    placeholder="Минимум 6 символов"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Подтверждение пароля */}
                <div>
                  <label className="block text-sm font-medium text-[#2A2A2A] mb-2" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}>
                    Подтвердите пароль <span className="text-[#B2223C]">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full bg-white border ${
                      errors.confirmPassword ? "border-red-500" : "border-gray-200"
                    } text-[#2A2A2A] py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B2223C] focus:border-transparent transition-all`}
                    style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}
                    placeholder="Повторите пароль"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Ошибка отправки */}
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-600 text-sm" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}>
                      {errors.submit}
                    </p>
                  </div>
                )}

                {/* Кнопка регистрации */}
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full bg-[#B2223C] hover:bg-[#D13B50] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-xl text-base transition-all duration-300 shadow-md shadow-[#B2223C]/20 hover:shadow-lg hover:shadow-[#B2223C]/30 mt-6"
                  style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}
                >
                  {isVerifying ? "Регистрация..." : "Зарегистрироваться"}
                </button>

                <div className="text-center mt-4">
                  <span
                    className="text-sm text-[#2A2A2A]/60"
                    style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}
                  >
                    Уже есть аккаунт?{" "}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setErrors({});
                      setStep("form");
                    }}
                    className="text-sm text-[#B2223C] hover:text-[#D13B50] transition-colors"
                    style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}
                  >
                    Войти
                  </button>
                </div>
              </form>
            </>
          ) : step === "telegram" ? (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-[#2A2A2A] mb-2" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}>
                    Подтвердите регистрацию через Telegram
                  </h3>
                  <p className="text-sm text-[#2A2A2A]/60 mb-4" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                    Нажмите на кнопку ниже, чтобы перейти в бота. После нажатия «Старт» в боте вернитесь на сайт и подтвердите, что вы привязали Telegram.
                  </p>
                </div>

                <a
                  href={`https://t.me/${botUsername}?start=${verificationCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white font-medium py-4 px-6 rounded-xl text-base transition-all duration-300 shadow-md shadow-[#0088cc]/20 hover:shadow-lg hover:shadow-[#0088cc]/30 flex items-center justify-center gap-3 mb-4"
                  style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Открыть Telegram
                </a>

                <button
                  onClick={handleCheckTelegramStatus}
                  disabled={isCheckingStatus || !verificationCode}
                  className="w-full bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 disabled:text-gray-500 text-[#2A2A2A] font-medium py-3 px-6 rounded-xl text-sm transition-all duration-300"
                  style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}
                >
                  {isCheckingStatus ? "Проверяем привязку..." : "Я подтвердил в Telegram"}
                </button>

                {isVerified && (
                  <p className="mt-3 text-sm text-green-600" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}>
                    Telegram успешно привязан! Сейчас мы закроем окно регистрации.
                  </p>
                )}
              </>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

