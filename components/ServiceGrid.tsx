"use client";

import BookingServicesGrid from "./BookingServicesGrid";

const ServiceGrid = ({ cms }: { cms?: { title?: string; subtitle?: string } }) => {
  return (
    <section id="services" className="relative w-full bg-[#09090D] overflow-hidden">
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
        <div className="mb-14 md:mb-16">
          <div className="flex items-center gap-4 mb-6">
            <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, #C8A96E, rgba(200,169,110,0.3))" }} />
            <span
              className="text-[#C8A96E] uppercase tracking-[0.35em]"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 10 }}
            >
              Каталог
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-end">
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
              {cms?.title ? cms.title : <>Наши{" "}
              <span style={{ color: "transparent", WebkitTextStroke: "1px rgba(200,169,110,0.5)" }}>
                услуги
              </span></>}
            </h2>
            <p
              style={{
                fontFamily: "var(--font-montserrat)",
                fontWeight: 200,
                fontSize: "clamp(13px, 1.4vw, 16px)",
                color: "rgba(255,255,255,0.38)",
                lineHeight: 1.8,
                maxWidth: 380,
              }}
            >
              {cms?.subtitle || "Выберите процедуру, подберите удобное время и запишитесь онлайн. Каждая услуга выполняется сертифицированным специалистом."}
            </p>
          </div>
        </div>

        <BookingServicesGrid carousel />
      </div>
    </section>
  );
};

export default ServiceGrid;
