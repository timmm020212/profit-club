"use client";

import { useEffect, useRef } from "react";

const ZONES = [
  {
    title: "Косметология",
    subtitle: "Аппаратная & инъекционная",
    description:
      "Ультразвуковой SMAS-лифтинг, биоревитализация, контурная пластика, мезотерапия, пилинги и комплексные программы антивозрастного ухода.",
    image: "/ultra-new.png",
    accent: "#9B8FA8",
    features: ["SMAS-лифтинг", "Биоревитализация", "Плазмолифтинг", "Мезотерапия", "Контурная пластика", "Пилинги"],
  },
  {
    title: "Фитнес",
    subtitle: "Персональный тренинг",
    description:
      "Оснащённый зал с современным оборудованием. Персональные и групповые тренировки под руководством сертифицированных тренеров.",
    image: "/fitness-gl.jpg",
    accent: "#B8A693",
    features: ["Персональные тренировки", "Групповые занятия", "Функциональный тренинг"],
  },
  {
    title: "Бар",
    subtitle: "Зона отдыха",
    description:
      "Авторские напитки, протеиновые коктейли и wellness-чаи. Идеальное место для отдыха до или после процедуры.",
    image: "/bar-main.jpg",
    accent: "#C8A96E",
    features: ["Авторские коктейли", "Wellness-чай", "Протеиновые смузи"],
  },
];

interface ZonesCms {
  overline?: string;
  title?: string;
  zones?: { title: string; subtitle?: string; description: string; image?: any; imagePath?: string; color?: string; features?: { text: string }[] }[];
}

export default function ZonesShowcase({ cms }: { cms?: ZonesCms | null }) {
  const zones = cms?.zones?.length ? cms.zones.map((z, i) => {
    const imgUrl = typeof z.image === "object" && z.image?.supabaseUrl ? z.image.supabaseUrl : (typeof z.image === "object" && z.image?.url ? z.image.url : (z.imagePath || ZONES[i]?.image || ""));
    return {
      title: z.title,
      subtitle: z.subtitle || "",
      description: z.description,
      image: imgUrl,
      accent: z.color || ZONES[i]?.accent || "#B2223C",
      features: z.features?.map(f => f.text) || ZONES[i]?.features || [],
    };
  }) : ZONES;
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const cards = sectionRef.current.querySelectorAll<HTMLElement>("[data-zone]");
    cards.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(40px)";
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.zone ?? 0) * 150;
          setTimeout(() => {
            el.style.transition = "opacity 0.8s ease, transform 0.8s cubic-bezier(0.16,1,0.3,1)";
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, delay);
          io.unobserve(el);
        });
      },
      { threshold: 0.1 }
    );
    cards.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative w-full bg-[#08080D] overflow-hidden">
      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Ambient orbs */}
      <div
        className="absolute pc-orb-float pointer-events-none"
        style={{
          top: "10%", right: "-8%",
          width: "45vw", height: "45vw", maxWidth: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(178,34,60,0.06) 0%, transparent 70%)",
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
              {cms?.overline || "Пространства"}
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
            {cms?.title || <>Три зоны —{" "}
            <span style={{ color: "transparent", WebkitTextStroke: "1px rgba(200,169,110,0.5)" }}>
              одна цель
            </span></>}
          </h2>
        </div>

        {/* Equal grid */}
        <div
          ref={sectionRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {zones.map((zone, i) => (
            <div
              key={i}
              data-zone={i}
              className="group relative rounded-2xl overflow-hidden border border-white/[0.06] transition-all duration-500 hover:border-white/[0.12] flex flex-col"
              style={{ background: "#0C0C14" }}
            >
              {/* Image area */}
              <div className="relative w-full h-[220px] md:h-[240px] overflow-hidden flex-shrink-0">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${zone.image})` }}
                />
              </div>

              {/* Content */}
              <div className="p-6 md:p-7 flex flex-col flex-grow">
                <div className="flex items-center gap-3 mb-3">
                  <h3
                    className="text-white"
                    style={{
                      fontFamily: "var(--font-playfair)",
                      fontWeight: 600,
                      fontSize: "clamp(1.3rem, 2.5vw, 1.6rem)",
                    }}
                  >
                    {zone.title}
                  </h3>
                  <span
                    className="text-white/20"
                    style={{ fontFamily: "var(--font-montserrat)", fontWeight: 200, fontSize: 12 }}
                  >
                    / {zone.subtitle}
                  </span>
                </div>

                <p
                  className="mb-5 flex-grow"
                  style={{
                    fontFamily: "var(--font-montserrat)",
                    fontWeight: 200,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.38)",
                    lineHeight: 1.7,
                  }}
                >
                  {zone.description}
                </p>

                {/* Feature tags */}
                <div className="flex flex-wrap gap-2">
                  {zone.features.map((f, j) => (
                    <span
                      key={j}
                      className="px-3 py-1.5 rounded-full border border-white/[0.06] text-white/30 transition-colors duration-300 group-hover:text-white/50 group-hover:border-white/[0.1]"
                      style={{
                        fontFamily: "var(--font-montserrat)",
                        fontWeight: 300,
                        fontSize: 11,
                        letterSpacing: "0.03em",
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
