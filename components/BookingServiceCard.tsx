"use client";

import Image from "next/image";

interface BookingServiceCardProps {
  id: number;
  name: string;
  description: string;
  price?: string | null;
  imageUrl?: string | null;
  duration?: number | string | null;
  category?: string | null;
  badgeText?: string | null;
  badgeType?: "dark" | "light" | "accent" | "discount" | null;
  featured?: boolean;
  onBook: () => void;
}

const BookingServiceCard: React.FC<BookingServiceCardProps> = ({
  name,
  description,
  price,
  imageUrl,
  duration,
  category,
  badgeText,
  badgeType,
  onBook,
}) => {
  return (
    <div
      className="group relative flex flex-col h-full rounded-2xl overflow-hidden bg-white transition-all duration-300 hover:-translate-y-0.5"
      style={{
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      {/* Image */}
      <div className="relative h-48 flex-shrink-0 overflow-hidden bg-[#f0eeeb]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
            quality={85}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#ede9e3] to-[#e4e0d8]">
            <span
              className="text-6xl select-none"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 200, color: "rgba(0,0,0,0.07)" }}
            >
              {name.charAt(0)}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {category && (
          <span
            className="absolute bottom-3 left-3 text-[10px] font-medium uppercase tracking-wider rounded-full px-2.5 py-1 backdrop-blur-md"
            style={{
              fontFamily: "var(--font-montserrat)",
              color: "rgba(255,255,255,0.9)",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {category}
          </span>
        )}

        {badgeText && (() => {
          const styles: Record<string, { bg: string; color: string }> = {
            accent:   { bg: "#B2223C", color: "#fff" },
            discount: { bg: "#059669", color: "#fff" },
            dark:     { bg: "#18181b", color: "#e4e4e7" },
            light:    { bg: "#fff",    color: "#18181b" },
          };
          const s = styles[badgeType ?? "accent"] ?? styles.accent;
          return (
            <span
              className="absolute top-3 right-3 text-[10px] font-medium rounded-md px-2.5 py-1"
              style={{ fontFamily: "var(--font-montserrat)", background: s.bg, color: s.color }}
            >
              {badgeText}
            </span>
          );
        })()}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-grow p-4 gap-2">

        {duration && (
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-[#aaa] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span
              className="text-[11px] text-[#aaa]"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 400 }}
            >
              {duration} мин
            </span>
          </div>
        )}

        <h3
          className="text-[15px] leading-snug text-[#1a1a1a]"
          style={{ fontFamily: "var(--font-montserrat)", fontWeight: 600, letterSpacing: "-0.01em" }}
        >
          {name}
        </h3>

        <p
          className="text-[12.5px] leading-relaxed flex-grow text-[#888]"
          style={{
            fontFamily: "var(--font-montserrat)", fontWeight: 400,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}
        >
          {description}
        </p>

        <div
          className="flex items-center justify-between gap-3 mt-2 pt-3"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
        >
          {price ? (
            <span
              className="text-[14px] tabular-nums text-[#1a1a1a]"
              style={{ fontFamily: "var(--font-montserrat)", fontWeight: 600 }}
            >
              {price}
            </span>
          ) : <span />}

          <button
            type="button"
            onClick={onBook}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95 flex-shrink-0"
            style={{
              fontFamily: "var(--font-montserrat)", fontWeight: 500,
              background: "linear-gradient(135deg, #B2223C, #d4395a)",
              boxShadow: "0 2px 12px rgba(178,34,60,0.25)",
            }}
          >
            Записаться
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingServiceCard;
