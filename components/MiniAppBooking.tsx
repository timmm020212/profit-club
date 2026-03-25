"use client";

import { useState, useEffect } from "react";
import BookingServicesGrid from "./BookingServicesGrid";

interface TelegramUser {
  telegramId: string;
  name: string;
  phone: string;
}

export default function MiniAppBooking() {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.initData) {
        tg.ready();
        tg.expand();
        try { tg.setHeaderColor("#09090D"); } catch {}
        try { tg.setBackgroundColor("#09090D"); } catch {}

        fetch("/api/miniapp/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.valid) {
              if (!data.client) {
                // Not registered — redirect to registration
                window.location.href = "/miniapp/register";
                return;
              }
              setTelegramUser({
                telegramId: data.telegramId,
                name: data.client.name || data.telegramName || "",
                phone: data.client.phone || "",
              });
            }
          })
          .catch(() => {});
      }
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  if (error) {
    return <div className="p-4 text-red-400 text-xs font-mono">{error}</div>;
  }

  return (
    <section className="py-4">
      <div className="container mx-auto px-4 max-w-6xl">
        <BookingServicesGrid telegramUser={telegramUser} />
      </div>
    </section>
  );
}
