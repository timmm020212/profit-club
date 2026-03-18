"use client";

export default function DarkMarquee() {
  const items = [
    "КОСМЕТОЛОГИЯ", "ФИТНЕС", "БАРБЕРШОП", "МАНИКЮР", "МАССАЖ",
    "УХОД ЗА ЛИЦОМ", "ИНЪЕКЦИИ", "ПИЛИНГ", "ЭПИЛЯЦИЯ", "СТРИЖКИ",
  ];

  return (
    <section className="relative w-full overflow-hidden bg-[#06060A] py-5 border-y border-white/[0.04]">
      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg, #06060A, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: "linear-gradient(270deg, #06060A, transparent)" }} />

      <div className="flex pc-marquee-track">
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <span
            key={i}
            className="flex-shrink-0 flex items-center gap-6 mx-6"
            style={{ fontFamily: "var(--font-montserrat)", fontWeight: 200 }}
          >
            <span className="text-xs tracking-[0.3em] text-white/20 uppercase whitespace-nowrap">
              {item}
            </span>
            <span className="w-1 h-1 rounded-full bg-[#C8A96E]/30 flex-shrink-0" />
          </span>
        ))}
      </div>
    </section>
  );
}
