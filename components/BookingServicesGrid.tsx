"use client";

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import BookingServiceCard from "./BookingServiceCard";

const BookingModal = dynamic(() => import("./BookingModal"), { ssr: false });

interface Service {
  id: number;
  name: string;
  description: string;
  price?: string | null;
  imageUrl?: string | null;
  duration?: number | string | null;
  category?: string | null;
  executorRole?: string | null;
  badgeText?: string | null;
  badgeType?: "dark" | "light" | "accent" | "discount" | null;
}

interface TelegramUser {
  telegramId: string;
  name: string;
  phone: string;
}

export default function BookingServicesGrid({ carousel = false, telegramUser }: { carousel?: boolean; telegramUser?: TelegramUser | null }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeService, setActiveService] = useState<Service | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const prevRects = useRef<Map<string, DOMRect>>(new Map());

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      setSearch((e as CustomEvent<{ query: string }>).detail.query ?? "");
    };
    window.addEventListener("profit_club_search", handler);
    return () => window.removeEventListener("profit_club_search", handler);
  }, []);

  const cats = useMemo(() => {
    return Array.from(new Set(services.map((s) => s.category).filter(Boolean) as string[]));
  }, [services]);

  const displayedCategories = useMemo(() => {
    const active = cats.filter((c) => activeFilters.has(c));
    const rest = cats.filter((c) => !activeFilters.has(c));
    return [...active, ...rest];
  }, [cats, activeFilters]);

  const toggleFilter = (cat: string) => {
    chipRefs.current.forEach((el, key) => {
      prevRects.current.set(key, el.getBoundingClientRect());
    });
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = services;
    if (activeFilters.size > 0) list = list.filter((s) => s.category && activeFilters.has(s.category));
    if (search.trim())
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(search.trim().toLowerCase()) ||
          (s.description ?? "").toLowerCase().includes(search.trim().toLowerCase())
      );
    return list;
  }, [services, activeFilters, search]);

  /* FLIP animation for chips */
  useLayoutEffect(() => {
    if (prevRects.current.size === 0) return;
    chipRefs.current.forEach((el, key) => {
      const prev = prevRects.current.get(key);
      if (!prev) return;
      const curr = el.getBoundingClientRect();
      const dx = prev.left - curr.left;
      if (Math.abs(dx) < 1) return;
      el.style.transition = "none";
      el.style.transform = `translateX(${dx}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.35s cubic-bezier(0.34,1.4,0.64,1)";
        el.style.transform = "translateX(0)";
      });
    });
    prevRects.current.clear();
  }, [activeFilters]);

  /* Stagger entrance */
  useEffect(() => {
    if (!gridRef.current) return;
    const items = gridRef.current.querySelectorAll<HTMLElement>("[data-card]");
    items.forEach((el) => { el.style.opacity = "0"; el.style.transform = "translateY(16px)"; });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, Number(el.dataset.card ?? 0) * 50);
          io.unobserve(el);
        });
      },
      { threshold: 0.04 }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 rounded-full border-2 border-[#B2223C]/20 border-t-[#B2223C] animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Filter chips */}
      {displayedCategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
          {displayedCategories.map((cat) => {
            const active = activeFilters.has(cat);
            return (
              <button
                key={cat}
                ref={(el) => { if (el) chipRefs.current.set(cat, el); else chipRefs.current.delete(cat); }}
                type="button"
                onClick={() => toggleFilter(cat)}
                className={`flex-shrink-0 flex items-center gap-1.5 rounded-full py-1.5 text-xs font-medium ${active ? "pl-3.5 pr-2.5" : "px-4"}`}
                style={{
                  fontFamily: "var(--font-montserrat)",
                  fontWeight: active ? 500 : 400,
                  background: active ? "#B2223C" : "rgba(255,255,255,0.04)",
                  border: active ? "1.5px solid #B2223C" : "1.5px solid rgba(255,255,255,0.08)",
                  color: active ? "#fff" : "rgba(255,255,255,0.45)",
                  boxShadow: active ? "0 2px 10px rgba(178,34,60,0.25)" : undefined,
                  transition: "background 0.2s, color 0.2s, box-shadow 0.2s, padding 0.2s",
                }}
              >
                {cat}
                {active && (
                  <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/25">
                    <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2l6 6M8 2l-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <p className="text-sm text-white/30" style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300 }}>
            Ничего не найдено
          </p>
          <button
            type="button"
            onClick={() => { setSearch(""); setActiveFilters(new Set()); window.dispatchEvent(new CustomEvent("profit_club_search", { detail: { query: "" } })); }}
            className="text-xs text-[#B2223C] hover:text-[#e8556e] transition-colors"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={gridRef}
            className={`grid grid-cols-2 lg:grid-cols-3 gap-3 ${carousel ? "overflow-y-auto scrollbar-none snap-y-mobile" : ""}`}
            style={carousel ? { maxHeight: 580 } : undefined}
          >
            {filtered.map((service, i) => (
              <div
                key={service.id}
                data-card={i}
                className={carousel ? "snap-start-mobile" : ""}
                style={{ transition: "opacity 0.48s ease, transform 0.48s ease" }}
              >
                <BookingServiceCard
                  id={service.id}
                  name={service.name}
                  description={service.description}
                  price={service.price}
                  imageUrl={service.imageUrl}
                  duration={service.duration}
                  category={service.category}
                  badgeText={service.badgeText}
                  badgeType={service.badgeType}
                  onBook={() => setActiveService(service)}
                />
              </div>
            ))}
          </div>
          {carousel && (
            <div
              className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-10"
              style={{ background: "linear-gradient(to top, #09090D, transparent)" }}
            />
          )}
        </div>
      )}

      <style jsx global>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {activeService && (
        <BookingModal service={activeService} onClose={() => setActiveService(null)} telegramUser={telegramUser} />
      )}
    </>
  );
}
