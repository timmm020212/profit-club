"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRegistration } from "./RegistrationProvider";

export default function Header() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const registration = useRegistration(); // Хук безопасный и не выбросит ошибку
  
  useEffect(() => {
    const syncFromStorage = () => {
      if (typeof window !== "undefined") {
        try {
          const status = localStorage.getItem("profit_club_user_registered");
          const storedName = localStorage.getItem("profit_club_user_name");

          if (status === "verified") {
            setIsRegistered(true);
            setUserName(storedName || null);
          } else {
            setIsRegistered(false);
            setUserName(null);
          }
        } catch (e) {
          console.error("Error reading registration state from localStorage", e);
        }
      }
    };

    syncFromStorage();
    window.addEventListener("profit_club_auth_changed", syncFromStorage);
    return () => {
      window.removeEventListener("profit_club_auth_changed", syncFromStorage);
    };
  }, []);
  
  const handleOpenRegistration = () => {
    registration.openLogin();
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("profit_club_user_registered");
        localStorage.removeItem("profit_club_user_name");
        localStorage.removeItem("profit_club_telegram_id");
      } catch (e) {
        console.error("Error clearing registration state", e);
      }
    }
    setIsRegistered(false);
    setUserName(null);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("profit_club_auth_changed"));
    }

    // После выхода можно сразу открыть модалку, чтобы протестировать новую регистрацию
    // registration.openRegistration();
  };

  return (
    <header className="bg-transparent sticky top-0 z-50 overflow-visible border-b border-[#E5E5E5]/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="relative h-16 md:h-20 lg:h-24 w-auto -mt-1">
            <Image
              src="/logo/logo1.png"
              alt="Profit Club"
              width={200}
              height={96}
              className="h-full w-auto object-contain"
              priority
            />
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={isRegistered ? handleLogout : handleOpenRegistration}
              className={`flex items-center gap-3 rounded-full px-5 py-2 text-sm shadow-md transition-colors ${
                isRegistered
                  ? "bg-[#B2223C] hover:bg-[#D13B50] text-white"
                  : "bg-white hover:bg-[#F5F5F5] text-[#B2223C]"
              }`}
              style={{ fontFamily: 'var(--font-montserrat)' }}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  isRegistered ? "bg-white/15 text-white" : "bg-[#B2223C] text-white"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.67-6 3.75A.75.75 0 0 0 6.75 19.5h10.5A.75.75 0 0 0 18 17.75C18 15.67 15.33 14 12 14Z"
                  />
                </svg>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs md:text-sm font-medium leading-tight max-w-[140px] md:max-w-[200px] truncate">
                  {isRegistered ? userName || "Пользователь" : "Войти"}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

