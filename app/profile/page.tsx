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
    <main className="min-h-screen bg-[#09090D]">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <a
          href="/booking"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          К услугам
        </a>
        <ClientProfileCard />
        <ClientAppointments />
        <ClientFavoriteMasters />
        <ClientHistory />
      </div>
    </main>
  );
}
