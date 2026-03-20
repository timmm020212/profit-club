"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRegistration } from "./RegistrationProvider";

export default function Header() {
  const pathname = usePathname();
  const hideSearch = pathname === "/profile" || pathname === "/login";
  const [isRegistered, setIsRegistered] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const registration = useRegistration();

  useEffect(() => {
    const syncFromStorage = () => {
      if (typeof window === "undefined") return;
      try {
        const status = localStorage.getItem("profit_club_user_registered");
        const storedName = localStorage.getItem("profit_club_user_name");
        if (status === "verified") { setIsRegistered(true); setUserName(storedName || null); }
        else { setIsRegistered(false); setUserName(null); }
      } catch {}
    };
    syncFromStorage();
    window.addEventListener("profit_club_auth_changed", syncFromStorage);
    return () => window.removeEventListener("profit_club_auth_changed", syncFromStorage);
  }, []);

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("profit_club_user_registered");
      localStorage.removeItem("profit_club_user_name");
      localStorage.removeItem("profit_club_telegram_id");
    } catch {}
    setIsRegistered(false);
    setUserName(null);
    window.dispatchEvent(new Event("profit_club_auth_changed"));
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    window.dispatchEvent(new CustomEvent("profit_club_search", { detail: { query: value } }));
    // если пользователь не на главной — прокрутить к услугам
    const el = document.getElementById("services");
    if (el && value) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07]"
      style={{ background: "rgba(9,9,13,0.85)", backdropFilter: "blur(20px)" }}>
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex items-center gap-4">

          {/* Logo */}
          <div className="flex-shrink-0 relative h-12 w-auto">
            <Image
              src="/logo/logo1.png"
              alt="Profit Club"
              width={140}
              height={48}
              className="h-full w-auto object-contain"
              priority
            />
          </div>

          {/* Spacer when search is hidden */}
          {hideSearch && <div className="flex-1" />}

          {/* Search — pill, center (hidden on profile/login) */}
          <div className={`flex-1 relative min-w-0 ${hideSearch ? "hidden" : ""}`}>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <svg className="w-3.5 h-3.5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Найти услугу..."
              className="w-full rounded-full border border-white/[0.09] bg-white/[0.05] pl-9 pr-9 py-2 text-sm text-zinc-200 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-[#B2223C]/50 focus:bg-white/[0.07]"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 400, fontSize: 16 }}
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Auth button */}
          <a
            href={isRegistered ? "/profile" : "/login"}
            className={`flex-shrink-0 flex items-center gap-2.5 rounded-full px-4 py-2 text-sm transition-all duration-200 ${
              isRegistered
                ? "bg-[#B2223C] hover:bg-[#c9294a] text-white"
                : "bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-300"
            }`}
            style={{ fontFamily: "var(--font-montserrat)", fontWeight: 400, fontSize: 13 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 1.67-6 3.75A.75.75 0 0 0 6.75 19.5h10.5A.75.75 0 0 0 18 17.75C18 15.67 15.33 14 12 14Z" />
            </svg>
            <span className="hidden sm:block max-w-[120px] truncate">
              {isRegistered ? (userName || "Профиль") : "Войти"}
            </span>
          </a>

        </div>
      </div>
    </header>
  );
}
