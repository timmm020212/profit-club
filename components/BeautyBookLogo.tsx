"use client";
import React from "react";

/**
 * BeautyBook logo — pure typographic wordmark.
 *
 * Design:
 *   - "Beauty" in dark charcoal + "Book" in sage accent — one word, two
 *     colours. No icon, no decorative shapes.
 *   - Thin short accent line beneath acts as the visual stamp.
 *   - Classic neutral sans (Inter) so it reads as established/refined
 *     across surfaces.
 *
 * Variants:
 *   - "horizontal" (default): wordmark with the bar underneath
 *   - "stacked": Beauty / Book on two lines for narrow layouts
 *   - "inline":  wordmark only, no bar (for tight headers)
 */
export interface BeautyBookLogoProps {
  variant?: "horizontal" | "stacked" | "inline";
  size?: number;       // wordmark font-size in px
  accent?: string;     // colour applied to "Book" + the bar
  text?: string;       // colour applied to "Beauty"
  className?: string;
  style?: React.CSSProperties;
}

export default function BeautyBookLogo({
  variant = "horizontal",
  size = 24,
  accent = "#4A6741",
  text   = "#1F2A1B",
  className,
  style,
}: BeautyBookLogoProps) {
  const family = "var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  if (variant === "stacked") {
    return (
      <span className={className} style={{
        display: "inline-flex", flexDirection: "column", alignItems: "flex-start",
        lineHeight: 1, fontFamily: family, fontWeight: 600,
        letterSpacing: "-0.02em",
        ...style,
      }}>
        <span style={{ fontSize: size, color: text }}>Beauty</span>
        <span style={{ fontSize: size, color: accent, marginTop: size * -0.08 }}>Book</span>
      </span>
    );
  }

  const wordmark = (
    <span style={{
      fontFamily: family, fontWeight: 600,
      fontSize: size, color: text,
      letterSpacing: "-0.02em",
      lineHeight: 1,
    }}>
      Beauty<span style={{ color: accent }}>Book</span>
    </span>
  );

  if (variant === "inline") {
    return <span className={className} style={style}>{wordmark}</span>;
  }

  return (
    <span className={className} style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      gap: size * 0.34,
      ...style,
    }}>
      {wordmark}
      <span style={{
        display: "block",
        width: size * 1.3, height: 2,
        background: accent,
        borderRadius: 1,
      }} />
    </span>
  );
}
