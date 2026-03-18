"use client";

import { useEffect, useState, createContext, useContext } from "react";
import RegistrationModal from "./RegistrationModal";

const REGISTRATION_STORAGE_KEY = "profit_club_user_registered";

// Контекст для управления модалкой регистрации
interface RegistrationContextType {
  openRegistration: () => void;
  openLogin: () => void;
  close: () => void;
  isOpen: boolean;
  mode: "login" | "register";
  setMode: (mode: "login" | "register") => void;
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

export function useRegistration() {
  const context = useContext(RegistrationContext);
  // Возвращаем безопасное значение по умолчанию, если контекст недоступен
  if (!context) {
    return {
      openRegistration: () => {
        console.warn("RegistrationProvider is not available. Cannot open registration modal.");
      },
      openLogin: () => {
        console.warn("RegistrationProvider is not available. Cannot open login modal.");
      },
      close: () => {
        console.warn("RegistrationProvider is not available. Cannot close modal.");
      },
      isOpen: false,
      mode: "login" as const,
      setMode: () => {
        console.warn("RegistrationProvider is not available. Cannot set mode.");
      },
    };
  }
  return context;
}

export default function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const [showRegistration, setShowRegistration] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Временно отключено для тестирования - раскомментируйте для включения автопоказа модалки
    // Проверяем, зарегистрирован ли пользователь (только если подтвержден)
    // Проверяем только на клиенте
    if (typeof window !== "undefined") {
      try {
        // Если пришёл из бота с tg_code — автооткрываем регистрацию
        const params = new URLSearchParams(window.location.search);
        const tgCode = params.get("tg_code");
        if (tgCode) {
          const isRegistered = localStorage.getItem(REGISTRATION_STORAGE_KEY);
          if (isRegistered !== "verified") {
            setMode("register");
            setShowRegistration(true);
          }
        }
      } catch (error) {
        console.error("Error accessing localStorage:", error);
      }
    }
  }, []);

  const close = () => {
    setShowRegistration(false);
  };

  // Функция для открытия модалки регистрации
  const openRegistration = () => {
    setMode("register");
    setShowRegistration(true);
  };

  const openLogin = () => {
    setMode("login");
    setShowRegistration(true);
  };

  // Всегда предоставляем контекст, даже до монтирования
  const contextValue = {
    openRegistration,
    openLogin,
    close,
    isOpen: showRegistration,
    mode,
    setMode,
  };

  return (
    <RegistrationContext.Provider value={contextValue}>
      {children}
      {mounted && <RegistrationModal />}
    </RegistrationContext.Provider>
  );
}

