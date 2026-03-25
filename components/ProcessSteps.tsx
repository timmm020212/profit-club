"use client";

import { useEffect, useRef } from "react";

const STEPS = [
  {
    num: "01",
    title: "Выберите услугу",
    text: "Откройте каталог, выберите процедуру и ознакомьтесь с описанием, ценой и длительностью.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Выберите дату и время",
    text: "Система покажет только свободные слоты, подтверждённые вашим мастером.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Подтвердите запись",
    text: "Укажите имя и телефон. Привяжите Telegram — и получайте напоминания автоматически.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Приходите",
    text: "За час до визита вам придёт напоминание. Расслабьтесь — мы позаботимся обо всём.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
];

export default function ProcessSteps({ cms }: { cms?: { title?: string; subtitle?: string } }) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const items = sectionRef.current.querySelectorAll<HTMLElement>("[data-step]");
    items.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateX(-24px)";
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.step ?? 0) * 150;
          setTimeout(() => {
            el.style.transition = "opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)";
            el.style.opacity = "1";
            el.style.transform = "translateX(0)";
          }, delay);
          io.unobserve(el);
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="process" className="relative w-full bg-[#06060A] overflow-hidden">
      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-12 py-24 md:py-32 lg:py-40">
        {/* Section header */}
        <div className="mb-14 md:mb-20">
          <div className="flex items-center gap-4 mb-6">
            <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, #C8A96E, rgba(200,169,110,0.3))" }} />
            <span
              className="text-[#C8A96E] uppercase tracking-[0.35em]"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 10 }}
            >
              Как записаться
            </span>
          </div>
          <h2
            className="text-white"
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 700,
              fontSize: "clamp(2.5rem, 5.5vw, 4.5rem)",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
            }}
          >
            {cms?.title || <>Четыре простых{" "}
            <span style={{ color: "transparent", WebkitTextStroke: "1px rgba(200,169,110,0.5)" }}>
              шага
            </span></>}
          </h2>
        </div>

        {/* Steps */}
        <div ref={sectionRef} className="relative">
          {/* Connecting line */}
          <div
            className="absolute left-[23px] top-0 bottom-0 w-px hidden md:block"
            style={{ background: "linear-gradient(to bottom, rgba(200,169,110,0.2), rgba(200,169,110,0.05), transparent)" }}
          />

          <div className="space-y-6">
            {STEPS.map((step, i) => (
              <div
                key={i}
                data-step={i}
                className="group relative flex items-start gap-6 md:gap-8 p-6 md:p-8 rounded-2xl border border-transparent transition-all duration-500 hover:border-white/[0.06] hover:bg-white/[0.015]"
              >
                {/* Number circle */}
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full border border-white/[0.08] flex items-center justify-center relative z-10 transition-all duration-500 group-hover:border-[#C8A96E]/25 group-hover:bg-[#C8A96E]/5"
                  style={{ background: "#0A0A12" }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-playfair)",
                      fontWeight: 500,
                      fontSize: 14,
                      color: "rgba(200,169,110,0.5)",
                    }}
                  >
                    {step.num}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[#C8A96E]/40 group-hover:text-[#C8A96E]/70 transition-colors duration-400">
                      {step.icon}
                    </span>
                    <h3
                      className="text-white"
                      style={{
                        fontFamily: "var(--font-montserrat)",
                        fontWeight: 400,
                        fontSize: 17,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-montserrat)",
                      fontWeight: 200,
                      fontSize: 14,
                      color: "rgba(255,255,255,0.35)",
                      lineHeight: 1.7,
                      maxWidth: 480,
                    }}
                  >
                    {step.text}
                  </p>
                </div>

                {/* Arrow on hover */}
                <div className="hidden md:flex items-center self-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-8px] group-hover:translate-x-0">
                  <svg width="20" height="20" fill="none" stroke="rgba(200,169,110,0.3)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 md:mt-20 flex items-center gap-6">
          <a href="/booking" className="pc-cta">
            <span>Записаться сейчас</span>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
