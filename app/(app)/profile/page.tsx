"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ClientProfileCard from "@/components/ClientProfileCard";
import ClientAppointments from "@/components/ClientAppointments";
import ClientFavoriteMasters from "@/components/ClientFavoriteMasters";
import ClientHistory from "@/components/ClientHistory";

export default function ProfilePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const status = localStorage.getItem("profit_club_user_registered");
    if (status !== "verified") {
      router.replace("/login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) return null;

  return (
    <main className="min-h-screen bg-[#06060A] relative overflow-hidden">
      {/* Grid lines background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Floating gradient orbs */}
      <div
        className="fixed w-[500px] h-[500px] rounded-full pointer-events-none pc-orb-float"
        style={{
          top: "-10%",
          right: "-8%",
          background:
            "radial-gradient(circle, rgba(178,34,60,0.08) 0%, rgba(200,169,110,0.04) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="fixed w-[400px] h-[400px] rounded-full pointer-events-none pc-orb-float"
        style={{
          bottom: "5%",
          left: "-5%",
          background:
            "radial-gradient(circle, rgba(200,169,110,0.06) 0%, rgba(178,34,60,0.03) 40%, transparent 70%)",
          filter: "blur(60px)",
          animationDelay: "-4s",
        }}
      />
      <div
        className="fixed w-[300px] h-[300px] rounded-full pointer-events-none pc-orb-float"
        style={{
          top: "40%",
          left: "50%",
          background:
            "radial-gradient(circle, rgba(200,169,110,0.03) 0%, transparent 60%)",
          filter: "blur(80px)",
          animationDelay: "-7s",
        }}
      />

      <div className="relative z-10">
        <Header />

        <div className="mx-auto max-w-5xl px-6 md:px-12 py-10">
          {/* Back link */}
          <a
            href="/booking"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-[#C8A96E] transition-colors mb-8 group"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className="transition-transform group-hover:-translate-x-0.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            К услугам
          </a>

          {/* Page title section */}
          <div className="mb-10 pc-fade-in">
            <div className="flex items-center gap-4 mb-4">
              <div
                style={{
                  width: 40,
                  height: 1,
                  background:
                    "linear-gradient(90deg, #C8A96E, rgba(200,169,110,0.3))",
                }}
              />
              <span
                className="text-[#C8A96E] uppercase tracking-[0.35em]"
                style={{
                  fontFamily: "var(--font-montserrat)",
                  fontWeight: 300,
                  fontSize: 10,
                }}
              >
                Личный кабинет
              </span>
            </div>
            <h1
              className="text-white"
              style={{
                fontFamily: "var(--font-playfair)",
                fontWeight: 700,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 0.95,
              }}
            >
              Мой{" "}
              <span
                style={{
                  color: "transparent",
                  WebkitTextStroke: "1px rgba(200,169,110,0.5)",
                }}
              >
                профиль
              </span>
            </h1>
          </div>

          {/* Gold divider */}
          <div
            className="h-px mb-10"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(200,169,110,0.2), transparent)",
            }}
          />

          {/* Components */}
          <div className="space-y-10">
            <div className="pc-slide-up" style={{ animationDelay: "0.1s" }}>
              <ClientProfileCard />
            </div>
            <div className="pc-slide-up" style={{ animationDelay: "0.2s" }}>
              <ClientAppointments />
            </div>
            <div className="pc-slide-up" style={{ animationDelay: "0.3s" }}>
              <ClientFavoriteMasters />
            </div>
            <div className="pc-slide-up" style={{ animationDelay: "0.4s" }}>
              <ClientHistory />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
