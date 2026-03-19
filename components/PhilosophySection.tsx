"use client";

import { useEffect, useRef } from "react";

const PILLARS = [
  {
    num: "01",
    title: "Индивидуальность",
    text: "Каждый визит начинается с персональной консультации. Мы не работаем по шаблону — мы создаём решения, которые подчёркивают вашу уникальность.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Экспертиза",
    text: "Наши мастера проходят обучение у ведущих специалистов Европы и России. Сертификаты, опыт и страсть к делу — три кита нашей команды.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Технологии",
    text: "Аппараты премиум-класса, сертифицированные препараты и доказательный подход — мы используем только то, что действительно работает.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Атмосфера",
    text: "Премиальный интерьер, приглушённый свет, авторские ароматы — пространство, где вы расслабляетесь с первой секунды.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  },
];

export default function PhilosophySection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const cards = sectionRef.current.querySelectorAll<HTMLElement>("[data-phil]");
    cards.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(32px)";
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.phil ?? 0) * 120;
          setTimeout(() => {
            el.style.transition = "opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)";
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, delay);
          io.unobserve(el);
        });
      },
      { threshold: 0.15 }
    );
    cards.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="philosophy" className="relative w-full bg-[#06060A] overflow-hidden">
      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Ambient orb */}
      <div
        className="absolute pc-orb-float pointer-events-none"
        style={{
          top: "20%", left: "-10%",
          width: "40vw", height: "40vw", maxWidth: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,169,110,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-12 py-24 md:py-32 lg:py-40">
        {/* Section header */}
        <div className="mb-16 md:mb-20">
          <div className="flex items-center gap-4 mb-6">
            <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, #C8A96E, rgba(200,169,110,0.3))" }} />
            <span
              className="text-[#C8A96E] uppercase tracking-[0.35em]"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 10 }}
            >
              Наша философия
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-end">
            <h2
              className="text-white leading-[0.95]"
              style={{
                fontFamily: "var(--font-playfair)",
                fontWeight: 700,
                fontSize: "clamp(2.5rem, 5.5vw, 4.5rem)",
                letterSpacing: "-0.02em",
              }}
            >
              Пространство,<br />
              <span style={{ color: "transparent", WebkitTextStroke: "1px rgba(200,169,110,0.5)" }}>
                где рождается
              </span>{" "}
              красота
            </h2>
            <p
              style={{
                fontFamily: "var(--font-montserrat)",
                fontWeight: 200,
                fontSize: "clamp(13px, 1.4vw, 16px)",
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.8,
                maxWidth: 420,
              }}
            >
              Profit Club — это не просто салон. Это экосистема, в которой косметология,
              фитнес и барбершоп объединены в единое целое. Мы верим, что забота о себе
              должна быть удовольствием, а не рутиной.
            </p>
          </div>
        </div>

        {/* Pillars grid */}
        <div ref={sectionRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p, i) => (
            <div
              key={i}
              data-phil={i}
              className="group relative rounded-2xl border border-white/[0.06] p-7 md:p-8 transition-all duration-500 hover:border-[#C8A96E]/20 hover:bg-white/[0.02]"
              style={{ background: "rgba(255,255,255,0.015)" }}
            >
              {/* Number */}
              <span
                className="block mb-6"
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontWeight: 500,
                  fontSize: 32,
                  lineHeight: 1,
                  background: "linear-gradient(135deg, rgba(200,169,110,0.25), rgba(200,169,110,0.08))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {p.num}
              </span>

              {/* Icon */}
              <div className="w-10 h-10 rounded-full border border-white/[0.08] flex items-center justify-center mb-5 text-[#C8A96E]/60 group-hover:text-[#C8A96E] group-hover:border-[#C8A96E]/20 transition-all duration-400">
                {p.icon}
              </div>

              {/* Title */}
              <h3
                className="text-white mb-3"
                style={{
                  fontFamily: "var(--font-montserrat)",
                  fontWeight: 400,
                  fontSize: 16,
                  letterSpacing: "0.02em",
                }}
              >
                {p.title}
              </h3>

              {/* Text */}
              <p
                style={{
                  fontFamily: "var(--font-montserrat)",
                  fontWeight: 200,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.35)",
                  lineHeight: 1.7,
                }}
              >
                {p.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
