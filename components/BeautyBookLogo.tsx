"use client";
import React from "react";

/**
 * BeautyBook logo — editorial sage mark + serif wordmark.
 *
 * Design:
 *   - Mark: thin circle (echoes the decorative circle on /partner/join)
 *           with italic Playfair "B" centered and a small period dot below
 *           (colophon-style flourish).
 *   - Wordmark: stacked "Beauty / Book" in Playfair — "Beauty" regular,
 *           "Book" italic in accent colour. Tight leading, magazine masthead.
 *
 * Variants:
 *   - "mark"        : icon only
 *   - "horizontal"  : icon + wordmark side by side (default)
 *   - "wordmark"    : text only
 *
 * Colors default to the sage/charcoal palette of the join page; pass `accent`
 * and `text` to recolour for dark surfaces or alternate themes.
 */
export interface BeautyBookLogoProps {
  variant?: "mark" | "horizontal" | "wordmark";
  size?: number;       // overall height in px; everything scales from it
  accent?: string;     // mark + italic "Book" colour
  text?: string;       // "Beauty" colour
  className?: string;
  style?: React.CSSProperties;
}

export default function BeautyBookLogo({
  variant = "horizontal",
  size = 44,
  accent = "#4A6741",
  text   = "#1F2A1B",
  className,
  style,
}: BeautyBookLogoProps) {
  if (variant === "wordmark") {
    return (
      <Wordmark size={size} accent={accent} text={text} className={className} style={style} />
    );
  }

  const mark = <Mark size={size} accent={accent} />;

  if (variant === "mark") {
    return <span className={className} style={style}>{mark}</span>;
  }

  return (
    <span className={className} style={{
      display: "inline-flex", alignItems: "center", gap: size * 0.28,
      ...style,
    }}>
      {mark}
      <Wordmark size={size * 0.82} accent={accent} text={text} />
    </span>
  );
}

// ────────── SVG mark ──────────
function Mark({ size, accent }: { size: number; accent: string }) {
  // viewBox is 48 — all sizes are proportional inside.
  const stroke = Math.max(1, size / 30); // ~1.5px at size 44
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* Outer ring */}
      <circle
        cx="24" cy="24" r="22.25"
        fill="none" stroke={accent}
        strokeWidth={stroke}
      />
      {/* Italic Playfair "B" — uses font-family from CSS variable. */}
      <text
        x="24" y="31.5"
        textAnchor="middle"
        fontFamily="var(--font-playfair), 'Playfair Display', Georgia, serif"
        fontStyle="italic"
        fontWeight={500}
        fontSize="22"
        fill={accent}
        style={{ letterSpacing: "-0.02em" }}
      >
        B
      </text>
      {/* Tiny colophon dot under the letter */}
      <circle cx="24" cy="38" r="0.95" fill={accent} />
    </svg>
  );
}

// ────────── Wordmark (stacked) ──────────
function Wordmark({
  size, accent, text, className, style,
}: { size: number; accent: string; text: string; className?: string; style?: React.CSSProperties }) {
  // size = approximate uppercase cap height of "Beauty". 14 → ~14px font.
  const fontSize = size * 0.38; // tuned visually
  return (
    <span
      className={className}
      style={{
        display: "inline-flex", flexDirection: "column",
        lineHeight: 0.96,
        fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
        fontWeight: 500,
        letterSpacing: "-0.01em",
        ...style,
      }}
    >
      <span style={{ fontSize, color: text }}>Beauty</span>
      <span style={{
        fontSize, color: accent, fontStyle: "italic",
        marginTop: fontSize * -0.06, // tighten optical gap
      }}>Book</span>
    </span>
  );
}
