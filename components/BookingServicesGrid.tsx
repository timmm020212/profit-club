"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import dynamic from "next/dynamic";
import BookingServiceCard from "./BookingServiceCard";
import ServiceVariantModal from "./ServiceVariantModal";

const BookingModal = dynamic(() => import("./BookingModal"), { ssr: false });

/* ─── Types ─────────────────────────────────────────────────── */

interface Variant {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface NestedService {
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
  variants: Variant[];
}

interface Subgroup {
  id: number;
  name: string;
  services: NestedService[];
}

interface Category {
  id: number;
  name: string;
  subgroups: Subgroup[];
}

interface TelegramUser {
  telegramId: string;
  name: string;
  phone: string;
}

/* ─── Component ──────────────────────────────────────────────── */

export default function BookingServicesGrid({
  carousel = false,
  telegramUser,
}: {
  carousel?: boolean;
  telegramUser?: TelegramUser | null;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Service selected for booking (after variant chosen or if no variants)
  const [activeService, setActiveService] = useState<NestedService | null>(null);
  const [activeVariant, setActiveVariant] = useState<Variant | null>(null);

  // Variant modal state
  const [variantModalService, setVariantModalService] = useState<NestedService | null>(null);

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const stripRef = useRef<HTMLDivElement>(null);
  const pillRects = useRef<Map<number, DOMRect>>(new Map());
  const isAnimating = useRef(false);

  /* Fetch nested data */
  useEffect(() => {
    fetch("/api/services?nested=true")
      .then((r) => r.json())
      .then((data) => {
        const cats: Category[] = Array.isArray(data?.categories) ? data.categories : [];
        setCategories(cats);
        setSelectedCategoryId(null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Sorted categories: active first for FLIP animation */
  const sortedCategories = selectedCategoryId === null
    ? categories
    : [
        ...categories.filter((c) => c.id === selectedCategoryId),
        ...categories.filter((c) => c.id !== selectedCategoryId),
      ];

  /* Active categories — all if none selected */
  const activeCategories = selectedCategoryId === null ? categories : categories.filter((c) => c.id === selectedCategoryId);

  /* FLIP: after re-render, animate each pill from saved position to new position */
  useLayoutEffect(() => {
    if (!stripRef.current || pillRects.current.size === 0) return;
    const pills = stripRef.current.querySelectorAll<HTMLButtonElement>("[data-cat-id]");
    pills.forEach((pill) => {
      const id = Number(pill.dataset.catId);
      const oldRect = pillRects.current.get(id);
      if (!oldRect) return;
      const newRect = pill.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      if (Math.abs(dx) < 2) return;
      pill.style.setProperty("--tx", `${dx}px`);
      const cls = id === selectedCategoryId ? "pill-spring-land" : "pill-flip-travel";
      pill.classList.add(cls);
      pill.addEventListener("animationend", () => pill.classList.remove(cls), { once: true });
    });
    pillRects.current = new Map();
  }, [selectedCategoryId]);

  /* Category click: ripple → capture positions → update state */
  function handleCategoryClick(catId: number, e: React.MouseEvent<HTMLButtonElement>) {
    if (isAnimating.current) return;

    // Ripple effect at click point
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.style.cssText = `position:absolute;border-radius:50%;background:rgba(232,85,110,0.45);width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;transform:scale(0);animation:pillRipple 0.4s ease-out forwards;pointer-events:none;`;
    btn.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });

    // Capture current pill positions for FLIP
    if (stripRef.current) {
      const pills = stripRef.current.querySelectorAll<HTMLButtonElement>("[data-cat-id]");
      pillRects.current = new Map();
      pills.forEach((p) => pillRects.current.set(Number(p.dataset.catId), p.getBoundingClientRect()));
    }

    isAnimating.current = true;
    setTimeout(() => {
      setSelectedCategoryId((prev) => (prev === catId ? null : catId));
      setTimeout(() => { isAnimating.current = false; }, 520);
    }, 80);
  }

  /* Handle card tap */
  function handleCardBook(service: NestedService) {
    // Auth check on site (not mini-app)
    if (!telegramUser && typeof window !== "undefined") {
      const isRegistered = localStorage.getItem("profit_club_user_registered") === "verified";
      if (!isRegistered) {
        setShowLoginPrompt(true);
        return;
      }
    }

    if (service.variants && service.variants.length > 0) {
      setVariantModalService(service);
    } else {
      setActiveVariant(null);
      setActiveService(service);
    }
  }

  /* Variant selected from modal */
  function handleVariantSelect(variant: Variant) {
    if (!variantModalService) return;
    setActiveVariant(variant);
    setActiveService(variantModalService);
    setVariantModalService(null);
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 rounded-full border-2 border-[#B2223C]/20 border-t-[#B2223C] animate-spin" />
      </div>
    );
  }

  /* ── Empty state ── */
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-white/30" style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300 }}>
          Услуги не найдены
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ── Category tabs ───────────────────────────────────── */}
      {categories.length > 1 && (
        <div
          ref={stripRef}
          className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none"
        >
          {sortedCategories.map((cat) => {
            const isActive = cat.id === selectedCategoryId;
            return (
              <button
                key={cat.id}
                data-cat-id={cat.id}
                type="button"
                onClick={(e) => handleCategoryClick(cat.id, e)}
                className="flex-shrink-0 rounded-full text-xs font-medium"
                style={{
                  fontFamily: "var(--font-montserrat)",
                  fontWeight: isActive ? 500 : 400,
                  padding: "6px 16px",
                  background: isActive ? "#B2223C" : "rgba(255,255,255,0.04)",
                  border: isActive ? "1.5px solid #B2223C" : "1.5px solid rgba(255,255,255,0.08)",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
                  boxShadow: isActive ? "0 2px 14px rgba(178,34,60,0.35)" : undefined,
                  transition: "background 0.25s, border-color 0.25s, color 0.25s, box-shadow 0.25s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {cat.name}
                {isActive && <span className="pill-shimmer" />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Subgroup sections ───────────────────────────────── */}
      {activeCategories.length > 0 && (
        <div className="flex flex-col gap-8">
          {activeCategories.flatMap((cat) => cat.subgroups).map((sg) => {
            if (!sg.services || sg.services.length === 0) return null;
            return (
              <div key={sg.id}>
                {/* Subgroup header */}
                <div className="flex items-center gap-3 mb-4">
                  <h3
                    className="text-sm font-semibold text-white/70 uppercase tracking-widest"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                  >
                    {sg.name}
                  </h3>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                {/* Service cards grid */}
                <div
                  className={`grid grid-cols-2 lg:grid-cols-3 gap-3 ${
                    carousel ? "overflow-y-auto scrollbar-none" : ""
                  }`}
                  style={carousel ? { maxHeight: 500 } : undefined}
                >
                  {sg.services.map((service, i) => (
                    <div
                      key={service.id}
                      data-card={i}
                      style={{ transition: "opacity 0.48s ease, transform 0.48s ease" }}
                    >
                      <BookingServiceCard
                        id={service.id}
                        name={service.name}
                        description={service.description}
                        price={
                          service.variants && service.variants.length > 0
                            ? `от ${Math.min(...service.variants.map((v) => v.price)).toLocaleString()} ₽`
                            : service.price ? `${Number(service.price).toLocaleString()} ₽` : undefined
                        }
                        imageUrl={service.imageUrl}
                        duration={
                          service.variants && service.variants.length > 0
                            ? undefined
                            : service.duration ?? undefined
                        }
                        category={service.category}
                        badgeText={
                          service.variants && service.variants.length > 0
                            ? `${service.variants.length} вар.`
                            : service.badgeText ?? undefined
                        }
                        badgeType={
                          service.variants && service.variants.length > 0
                            ? "dark"
                            : service.badgeType ?? undefined
                        }
                        onBook={() => handleCardBook(service)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes pillRipple {
          to { transform: scale(3); opacity: 0; }
        }

        @keyframes pillSpringLand {
          0%   { transform: translateX(var(--tx)) scale(0.88); }
          50%  { transform: translateX(0) scale(1.08) translateY(-2px); box-shadow: 0 8px 24px rgba(178,34,60,0.5); }
          100% { transform: scale(1) translateY(0); }
        }
        .pill-spring-land {
          animation: pillSpringLand 0.5s cubic-bezier(0.34,1.56,0.64,1) both !important;
        }

        @keyframes pillFlipTravel {
          0%   { transform: translateX(var(--tx)) scale(0.93); opacity: 0.65; }
          70%  { transform: translateX(calc(var(--tx) * 0.03)) scale(1.01); }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        .pill-flip-travel {
          animation: pillFlipTravel 0.42s cubic-bezier(0.34,1.3,0.64,1) both !important;
        }

        .pill-shimmer {
          position: absolute;
          top: 0; left: -80%;
          width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
          animation: pillShimmerPass 0.55s 0.28s ease both;
          pointer-events: none;
        }
        @keyframes pillShimmerPass {
          0%   { left: -80%; opacity: 0; }
          20%  { opacity: 1; }
          100% { left: 140%; opacity: 0; }
        }
      `}</style>

      {/* ── ServiceVariantModal ──────────────────────────────── */}
      {variantModalService && (
        <ServiceVariantModal
          isOpen={true}
          onClose={() => setVariantModalService(null)}
          onSelect={handleVariantSelect}
          serviceName={variantModalService.name}
          variants={variantModalService.variants}
        />
      )}

      {/* ── BookingModal ─────────────────────────────────────── */}
      {activeService && (
        <BookingModal
          service={activeService}
          onClose={() => { setActiveService(null); setActiveVariant(null); }}
          telegramUser={telegramUser}
          variant={activeVariant}
        />
      )}

      {/* ── Login prompt ─────────────────────────────────────── */}
      {showLoginPrompt && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            className="relative w-full max-w-sm bg-[#0e0e14] border border-white/10 rounded-3xl shadow-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#B2223C] to-[#e8556e] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3
              className="text-lg font-semibold text-white mb-2"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Войдите для записи
            </h3>
            <p
              className="text-sm text-white/40 mb-5"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Для записи на услуги необходимо войти в аккаунт
            </p>
            <a
              href="/login"
              className="inline-flex items-center justify-center w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all"
              style={{
                fontFamily: "var(--font-montserrat)",
                background: "linear-gradient(135deg, #B2223C, #d4395a)",
                boxShadow: "0 2px 12px rgba(178,34,60,0.25)",
              }}
            >
              Войти
            </a>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="mt-3 text-sm text-white/30 hover:text-white/50 transition-colors"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </>
  );
}
