"use client";

import { useEffect, useRef, useState } from "react";

interface Master {
  id: number;
  fullName: string;
  specialization: string;
  phone?: string | null;
  photoUrl?: string | null;
  isActive: boolean;
  showOnSite?: boolean;
}

const ACCENT_COLORS = ["#9B8FA8", "#B8A693", "#C8A96E", "#B2223C", "#6B8A7A", "#8B7EC8"];

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

export default function MastersSection() {
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/masters")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data.filter((m: Master) => m.isActive && m.showOnSite !== false) : [];
        setMasters(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Entrance animation */
  useEffect(() => {
    if (!sectionRef.current) return;
    const cards = sectionRef.current.querySelectorAll<HTMLElement>("[data-master]");
    cards.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateX(30px) scale(0.97)";
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.master ?? 0) * 100;
          setTimeout(() => {
            el.style.transition = "opacity 0.6s ease, transform 0.6s cubic-bezier(0.16,1,0.3,1)";
            el.style.opacity = "1";
            el.style.transform = "translateX(0) scale(1)";
          }, delay);
          io.unobserve(el);
        });
      },
      { threshold: 0.1 }
    );
    cards.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [masters]);

  if (loading) {
    return (
      <section className="relative w-full bg-[#08080D] overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 md:px-12 py-20">
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-[#C8A96E]/20 border-t-[#C8A96E] animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (masters.length === 0) return null;

  return (
    <section id="masters" className="relative w-full bg-[#08080D] overflow-hidden">
      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Ambient orb */}
      <div
        className="absolute pc-orb-float pointer-events-none"
        style={{
          bottom: "0%", right: "5%",
          width: "35vw", height: "35vw", maxWidth: 450,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(178,34,60,0.05) 0%, transparent 70%)",
          animationDelay: "-3s",
        }}
      />

      <div className="relative z-10 py-20 md:py-28">
        {/* Section header */}
        <div className="mx-auto max-w-6xl px-6 md:px-12 mb-10 md:mb-14">
          <div className="flex items-center gap-4 mb-5">
            <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, #C8A96E, rgba(200,169,110,0.3))" }} />
            <span
              className="text-[#C8A96E] uppercase tracking-[0.35em]"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 10 }}
            >
              Команда
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-end">
            <h2
              className="text-white"
              style={{
                fontFamily: "var(--font-playfair)",
                fontWeight: 700,
                fontSize: "clamp(2.2rem, 5vw, 4rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
              }}
            >
              Наши{" "}
              <span style={{ color: "transparent", WebkitTextStroke: "1px rgba(200,169,110,0.5)" }}>
                мастера
              </span>
            </h2>
            <p
              style={{
                fontFamily: "var(--font-montserrat)",
                fontWeight: 200,
                fontSize: "clamp(12px, 1.4vw, 15px)",
                color: "rgba(255,255,255,0.38)",
                lineHeight: 1.8,
                maxWidth: 380,
              }}
            >
              Каждый специалист — профессионал с подтверждённой
              квалификацией и собственным подходом к работе.
            </p>
          </div>
        </div>

        {/* Horizontal carousel */}
        <div className="relative" ref={sectionRef}>
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-none snap-x-mobile px-6 md:px-12"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {masters.map((master, i) => {
              const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
              const initials = getInitials(master.fullName);
              return (
                <div
                  key={master.id}
                  data-master={i}
                  className="snap-start-mobile flex-shrink-0 group relative rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-500 hover:border-white/[0.12]"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    width: "clamp(240px, 42vw, 300px)",
                  }}
                >
                  {/* Avatar area */}
                  <div className={`relative flex items-center justify-center overflow-hidden ${master.photoUrl ? "h-56" : "h-44"}`}>
                    {master.photoUrl ? (
                      <>
                        <img
                          src={master.photoUrl}
                          alt={master.fullName}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)" }} />
                      </>
                    ) : (
                      <>
                        <div
                          className="absolute inset-0"
                          style={{ background: `radial-gradient(circle at 50% 120%, ${color}15, transparent 70%)` }}
                        />
                        <div
                          className="relative w-20 h-20 rounded-full flex items-center justify-center border transition-all duration-500 group-hover:scale-110"
                          style={{ borderColor: `${color}30`, background: `${color}08` }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-playfair)",
                              fontWeight: 600,
                              fontSize: 22,
                              color: `${color}90`,
                            }}
                          >
                            {initials}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3
                      className="text-white mb-1"
                      style={{ fontFamily: "var(--font-montserrat)", fontWeight: 400, fontSize: 16 }}
                    >
                      {master.fullName}
                    </h3>
                    <span
                      style={{
                        fontFamily: "var(--font-montserrat)",
                        fontWeight: 300,
                        fontSize: 13,
                        color: color,
                        opacity: 0.7,
                      }}
                    >
                      {master.specialization}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Spacer for last card padding */}
            <div className="flex-shrink-0 w-2 md:w-8" />
          </div>

          {/* Left fade */}
          <div
            className="absolute top-0 bottom-0 left-0 w-10 pointer-events-none z-10"
            style={{ background: "linear-gradient(to right, #08080D, transparent)" }}
          />
          {/* Right fade */}
          <div
            className="absolute top-0 bottom-0 right-0 w-10 pointer-events-none z-10"
            style={{ background: "linear-gradient(to left, #08080D, transparent)" }}
          />
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </section>
  );
}
