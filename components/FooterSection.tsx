"use client";

const LINKS = {
  services: [
    { label: "Косметология", href: "/booking" },
    { label: "Фитнес", href: "/booking" },
    { label: "Барбершоп", href: "/booking" },
    { label: "Маникюр", href: "/booking" },
    { label: "Массаж", href: "/booking" },
  ],
  info: [
    { label: "О нас", href: "#philosophy" },
    { label: "Команда", href: "#masters" },
    { label: "Отзывы", href: "#testimonials" },
    { label: "Как записаться", href: "#process" },
  ],
};

const SCHEDULE = [
  { days: "Пн — Пт", hours: "09:00 — 21:00" },
  { days: "Сб", hours: "10:00 — 20:00" },
  { days: "Вс", hours: "10:00 — 18:00" },
];

interface FooterCms {
  cta?: { title?: string; subtitle?: string; buttonText?: string; buttonLink?: string };
  brand?: { name?: string; description?: string };
  serviceLinks?: { label: string; href: string }[];
  infoLinks?: { label: string; href: string }[];
  schedule?: { days: string; hours: string }[];
  contacts?: { phone?: string; address?: string; telegram?: string; instagram?: string };
  copyright?: string;
  title?: string; subtitle?: string; // legacy
}

export default function FooterSection({ cms }: { cms?: FooterCms | null }) {
  const serviceLinks = cms?.serviceLinks?.length ? cms.serviceLinks : LINKS.services;
  const infoLinks = cms?.infoLinks?.length ? cms.infoLinks : LINKS.info;
  const schedule = cms?.schedule?.length ? cms.schedule : SCHEDULE;
  return (
    <footer className="relative w-full bg-[#04040A] overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Top divider */}
      <div className="pc-gold-line" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-12 py-16 md:py-20">
        {/* CTA banner */}
        <div
          className="relative rounded-2xl border border-white/[0.06] px-6 py-10 md:px-12 md:py-14 mb-16 md:mb-20 text-center overflow-hidden"
          style={{ background: "rgba(178,34,60,0.04)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(178,34,60,0.08) 0%, transparent 70%)",
            }}
          />
          <h3
            className="relative text-white mb-5"
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 700,
              fontSize: "clamp(1.8rem, 4vw, 3rem)",
              lineHeight: 1.1,
            }}
          >
            {cms?.cta?.title || cms?.title || "Готовы преобразиться?"}
          </h3>
          <p
            className="relative"
            style={{
              fontFamily: "var(--font-montserrat)",
              fontWeight: 200,
              fontSize: 15,
              color: "rgba(255,255,255,0.4)",
              maxWidth: 400,
              margin: "0 auto",
              marginBottom: 32,
              lineHeight: 1.7,
            }}
          >
            {cms?.subtitle || "Запишитесь онлайн — выберите удобное время и мастера за пару кликов"}
          </p>
          <a href="/booking" className="pc-cta inline-flex relative">
            <span>Записаться</span>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>

        {/* Footer columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-14">
          {/* Brand */}
          <div className="lg:col-span-1">
            <h4
              className="text-white mb-3"
              style={{
                fontFamily: "var(--font-playfair)",
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: "-0.01em",
              }}
            >
              PROFIT
              <span
                className="block"
                style={{
                  color: "transparent",
                  WebkitTextStroke: "1px rgba(200,169,110,0.4)",
                }}
              >
                CLUB
              </span>
            </h4>
            <p
              style={{
                fontFamily: "var(--font-montserrat)",
                fontWeight: 200,
                fontSize: 13,
                color: "rgba(255,255,255,0.3)",
                lineHeight: 1.7,
              }}
            >
              {cms?.brand?.description || "Премиальный салон красоты."}<br />
              Косметология, фитнес и барбершоп
              в одном пространстве.
            </p>
          </div>

          {/* Services */}
          <div>
            <h5
              className="text-white/50 uppercase tracking-[0.2em] mb-4"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 400, fontSize: 10 }}
            >
              Услуги
            </h5>
            <ul className="space-y-2.5">
              {serviceLinks.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href}
                    className="transition-colors duration-300 hover:text-[#C8A96E]"
                    style={{
                      fontFamily: "var(--font-montserrat)",
                      fontWeight: 300,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.3)",
                      textDecoration: "none",
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h5
              className="text-white/50 uppercase tracking-[0.2em] mb-4"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 400, fontSize: 10 }}
            >
              Информация
            </h5>
            <ul className="space-y-2.5">
              {infoLinks.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href}
                    className="transition-colors duration-300 hover:text-[#C8A96E]"
                    style={{
                      fontFamily: "var(--font-montserrat)",
                      fontWeight: 300,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.3)",
                      textDecoration: "none",
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Schedule & Contact */}
          <div>
            <h5
              className="text-white/50 uppercase tracking-[0.2em] mb-4"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 400, fontSize: 10 }}
            >
              Режим работы
            </h5>
            <ul className="space-y-2 mb-6">
              {schedule.map((s, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span
                    style={{
                      fontFamily: "var(--font-montserrat)",
                      fontWeight: 300,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    {s.days}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-montserrat)",
                      fontWeight: 400,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {s.hours}
                  </span>
                </li>
              ))}
            </ul>

            {/* Contact */}
            <div className="space-y-2">
              <a
                href="tel:+79001234567"
                className="block transition-colors duration-300 hover:text-[#C8A96E]"
                style={{
                  fontFamily: "var(--font-montserrat)",
                  fontWeight: 400,
                  fontSize: 14,
                  color: "rgba(255,255,255,0.45)",
                  textDecoration: "none",
                }}
              >
                {cms?.contacts?.phone || "+7 (900) 123-45-67"}
              </a>
              <p
                style={{
                  fontFamily: "var(--font-montserrat)",
                  fontWeight: 200,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.2)",
                }}
              >
                {cms?.contacts?.address || "г. Москва, ул. Пример, д. 1"}
              </p>
              {(cms?.contacts?.telegram || cms?.contacts?.instagram) && (
                <div className="flex items-center gap-3 mt-2">
                  {cms?.contacts?.telegram && (
                    <a href={cms.contacts.telegram} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 12, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}
                      className="hover:text-[#C8A96E] transition-colors">
                      Telegram
                    </a>
                  )}
                  {cms?.contacts?.instagram && (
                    <a href={cms.contacts.instagram} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 12, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}
                      className="hover:text-[#C8A96E] transition-colors">
                      Instagram
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pc-gold-line mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            style={{
              fontFamily: "var(--font-montserrat)",
              fontWeight: 200,
              fontSize: 11,
              color: "rgba(255,255,255,0.15)",
            }}
          >
            &copy; {new Date().getFullYear()} Profit Club. Все права защищены.
          </p>
          <div className="flex gap-4">
            {/* Telegram */}
            <a
              href="#"
              className="w-8 h-8 rounded-full border border-white/[0.06] flex items-center justify-center text-white/20 hover:text-[#C8A96E] hover:border-[#C8A96E]/20 transition-all duration-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
            {/* Instagram */}
            <a
              href="#"
              className="w-8 h-8 rounded-full border border-white/[0.06] flex items-center justify-center text-white/20 hover:text-[#C8A96E] hover:border-[#C8A96E]/20 transition-all duration-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            {/* WhatsApp */}
            <a
              href="#"
              className="w-8 h-8 rounded-full border border-white/[0.06] flex items-center justify-center text-white/20 hover:text-[#C8A96E] hover:border-[#C8A96E]/20 transition-all duration-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
