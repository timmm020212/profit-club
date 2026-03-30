"use client";

import { useEffect, useRef, useState } from "react";

const TESTIMONIALS = [
  {
    name: "Мария К.",
    service: "Биоревитализация",
    text: "Ходила в разные клиники, но результат здесь — небо и земля. Анна объяснила каждый шаг, подобрала курс под мою кожу. После третьей процедуры знакомые начали спрашивать, что я делаю.",
    rating: 5,
  },
  {
    name: "Алексей П.",
    service: "Персональный тренинг",
    text: "За 3 месяца с Дмитрием сбросил 8 кг и набрал мышечную массу. Тренировки не по шаблону — каждый раз что-то новое, но всегда по моим целям. Зал отличный, нет очередей.",
    rating: 5,
  },
  {
    name: "Екатерина В.",
    service: "Аппаратный маникюр",
    text: "Наконец-то нашла мастера, которому можно доверять. Елена делает идеальное покрытие, которое держится 3+ недели. Атмосфера в салоне — отдельное удовольствие.",
    rating: 5,
  },
  {
    name: "Игорь Д.",
    service: "SMAS-лифтинг",
    text: "Скептически относился к косметологии, но жена записала. Эффект подтяжки лица заметен даже мне. Процедура безболезненная, результат — на несколько лет. Стоит каждого рубля.",
    rating: 5,
  },
  {
    name: "Ольга Р.",
    service: "Контурная пластика",
    text: "Пришла за губами — осталась на уход за всем лицом. Профессиональный подход, натуральный результат, никакой «кукольности». Рекомендую всем подругам.",
    rating: 5,
  },
  {
    name: "Тимур А.",
    service: "Мужская стрижка + борода",
    text: "Максим — лучший барбер, к которому я ходил. Понимает с полуслова, стрижка держит форму полтора месяца. Бонусом — отличный кофе в баре.",
    rating: 5,
  },
];

interface TestimonialsCms {
  overline?: string;
  title?: string;
  items?: { name: string; service: string; text: string; rating?: number }[];
}

export default function TestimonialsSection({ cms }: { cms?: TestimonialsCms | null }) {
  const testimonials = cms?.items?.length ? cms.items.map(t => ({ ...t, rating: t.rating || 5 })) : TESTIMONIALS;
  const [activeIdx, setActiveIdx] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Autoplay
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const goTo = (idx: number) => {
    setActiveIdx(idx);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % testimonials.length);
    }, 5000);
  };

  const current = testimonials[activeIdx];

  return (
    <section id="testimonials" className="relative w-full bg-[#06060A] overflow-hidden">
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
          top: "30%", left: "50%",
          width: "50vw", height: "50vw", maxWidth: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,169,110,0.04) 0%, transparent 70%)",
          transform: "translateX(-50%)",
        }}
      />

      <div ref={sectionRef} className="relative z-10 mx-auto max-w-5xl px-6 md:px-12 py-24 md:py-32 lg:py-40">
        {/* Section header */}
        <div className="mb-14 md:mb-20 text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div style={{ width: 40, height: 1, background: "linear-gradient(270deg, #C8A96E, rgba(200,169,110,0.3))" }} />
            <span
              className="text-[#C8A96E] uppercase tracking-[0.35em]"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 10 }}
            >
              {cms?.overline || "Отзывы"}
            </span>
            <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, #C8A96E, rgba(200,169,110,0.3))" }} />
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
            {cms?.title || <>Что говорят{" "}
            <span style={{ color: "transparent", WebkitTextStroke: "1px rgba(200,169,110,0.5)" }}>
              клиенты
            </span></>}
          </h2>
        </div>

        {/* Testimonial card */}
        <div className="relative max-w-3xl mx-auto">
          {/* Big quote mark */}
          <div
            className="absolute -top-6 -left-4 md:-left-8 select-none pointer-events-none"
            style={{
              fontFamily: "var(--font-playfair)",
              fontSize: "clamp(80px, 12vw, 140px)",
              lineHeight: 1,
              color: "rgba(200,169,110,0.06)",
              fontWeight: 700,
            }}
          >
            &ldquo;
          </div>

          <div
            className="relative rounded-2xl border border-white/[0.06] p-8 md:p-12"
            style={{ background: "rgba(255,255,255,0.015)", minHeight: 220 }}
          >
            {/* Stars */}
            <div className="flex gap-1 mb-6">
              {Array.from({ length: current.rating }).map((_, i) => (
                <svg key={i} className="w-4 h-4" viewBox="0 0 20 20" fill="#C8A96E">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            {/* Text */}
            <p
              className="mb-8"
              style={{
                fontFamily: "var(--font-montserrat)",
                fontWeight: 200,
                fontSize: "clamp(15px, 1.8vw, 18px)",
                color: "rgba(255,255,255,0.55)",
                lineHeight: 1.8,
                transition: "opacity 0.4s ease",
              }}
            >
              {current.text}
            </p>

            {/* Author */}
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-full border border-white/[0.08] flex items-center justify-center"
                style={{ background: "rgba(200,169,110,0.05)" }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-montserrat)",
                    fontWeight: 400,
                    fontSize: 12,
                    color: "rgba(200,169,110,0.6)",
                  }}
                >
                  {current.name.charAt(0)}
                </span>
              </div>
              <div>
                <div
                  className="text-white"
                  style={{ fontFamily: "var(--font-montserrat)", fontWeight: 400, fontSize: 14 }}
                >
                  {current.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-montserrat)",
                    fontWeight: 300,
                    fontSize: 12,
                    color: "rgba(200,169,110,0.5)",
                  }}
                >
                  {current.service}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className="transition-all duration-300"
                style={{
                  width: i === activeIdx ? 32 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === activeIdx
                    ? "linear-gradient(135deg, #C8A96E, #B2223C)"
                    : "rgba(255,255,255,0.1)",
                }}
                aria-label={`Отзыв ${i + 1}`}
              />
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
