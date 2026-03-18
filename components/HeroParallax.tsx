"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Header from "./Header";

const STATS = [
  { num: "8+",   label: "лет опыта" },
  { num: "500+", label: "довольных клиентов" },
  { num: "15+",  label: "мастеров" },
  { num: "30+",  label: "видов услуг" },
];

export default function HeroParallax() {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const parallaxOffset = scrollY * 0.28;
  const contentOpacity = Math.max(0, 1 - scrollY / 650);

  return (
    <div ref={heroRef} className="relative w-full overflow-hidden bg-[#06060A]" style={{ height: "100svh", minHeight: 600 }}>

      {/* Ambient gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute pc-orb-float"
          style={{
            top: "-10%", right: "-5%",
            width: "55vw", height: "55vw", maxWidth: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(178,34,60,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute pc-orb-float"
          style={{
            bottom: "-10%", left: "10%",
            width: "40vw", height: "40vw", maxWidth: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200,169,110,0.07) 0%, transparent 70%)",
            animationDelay: "-4s",
          }}
        />
        <div
          className="absolute"
          style={{
            top: "40%", left: "30%",
            width: "30vw", height: "30vw", maxWidth: 350,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(178,34,60,0.05) 0%, transparent 70%)",
            animationDelay: "-2s",
          }}
        />
      </div>

      {/* Hero image with parallax */}
      <div
        className="absolute inset-0"
        style={{ transform: `translateY(${parallaxOffset}px)`, willChange: "transform" }}
      >
        <Image
          src="/hero-image.png"
          alt="Profit Club"
          fill
          className="object-cover object-center"
          priority
          unoptimized
        />
        {/* Multi-layer overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(108deg, rgba(6,6,10,0.93) 0%, rgba(6,6,10,0.78) 40%, rgba(6,6,10,0.45) 70%, rgba(6,6,10,0.65) 100%)",
          }}
        />
      </div>

      {/* Subtle grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 w-full z-30">
        <Header />
      </div>

      {/* Main content */}
      <div
        className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 lg:px-24 xl:px-32 z-20"
        style={{ opacity: contentOpacity, paddingTop: "80px" }}
      >
        {/* Overline */}
        <div
          className="flex items-center gap-4 mb-7 pc-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, #C8A96E, rgba(200,169,110,0.3))" }} />
          <span
            className="text-[#C8A96E] uppercase tracking-[0.35em]"
            style={{ fontFamily: "var(--font-montserrat)", fontWeight: 300, fontSize: 10 }}
          >
            Premium Beauty &amp; Fitness
          </span>
        </div>

        {/* Giant title */}
        <div style={{ overflow: "hidden", marginBottom: 4 }}>
          <h1
            className="text-white pc-slide-up"
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 700,
              fontSize: "clamp(4.5rem, 13vw, 12.5rem)",
              lineHeight: 0.9,
              animationDelay: "0.2s",
              letterSpacing: "-0.01em",
            }}
          >
            PROFIT
          </h1>
        </div>
        <div style={{ overflow: "hidden", marginBottom: 32 }}>
          <h1
            className="pc-slide-up"
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 700,
              fontSize: "clamp(4.5rem, 13vw, 12.5rem)",
              lineHeight: 0.9,
              animationDelay: "0.35s",
              letterSpacing: "-0.01em",
              color: "transparent",
              WebkitTextStroke: "1.5px rgba(200,169,110,0.55)",
            }}
          >
            CLUB
          </h1>
        </div>

        {/* Subtitle */}
        <p
          className="pc-fade-in"
          style={{
            fontFamily: "var(--font-montserrat)",
            fontWeight: 200,
            fontSize: "clamp(13px, 1.6vw, 17px)",
            color: "rgba(255,255,255,0.45)",
            maxWidth: 380,
            lineHeight: 1.7,
            marginBottom: 36,
            animationDelay: "0.55s",
          }}
        >
          Современная косметология, мастера высшей категории
          и оснащённый фитнес-зал в одном пространстве
        </p>

        {/* CTAs */}
        <div
          className="flex items-center gap-5 flex-wrap pc-fade-in"
          style={{ animationDelay: "0.7s" }}
        >
          <a href="/booking" className="pc-cta">
            <span>Записаться</span>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="#services"
            style={{
              fontFamily: "var(--font-montserrat)",
              fontWeight: 300,
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              transition: "color 0.3s ease",
              textDecoration: "none",
            }}
            onMouseEnter={e => ((e.target as HTMLElement).style.color = "rgba(200,169,110,0.7)")}
            onMouseLeave={e => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.35)")}
          >
            Наши услуги ↓
          </a>
        </div>

        {/* Stats row */}
        <div
          className="pc-fade-in flex items-center gap-8 flex-wrap"
          style={{
            position: "absolute",
            bottom: 44,
            left: "clamp(32px, 6.5vw, 128px)",
            animationDelay: "0.95s",
          }}
        >
          {STATS.map(({ num, label }, i) => (
            <div key={i} style={{ animationDelay: `${0.95 + i * 0.1}s` }}>
              <div
                className="pc-stat-num"
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontWeight: 500,
                  fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {num}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-montserrat)",
                  fontWeight: 300,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.28)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div
          className="pc-fade-in flex flex-col items-center gap-2"
          style={{
            position: "absolute",
            bottom: 36,
            right: "clamp(32px, 6.5vw, 128px)",
            animationDelay: "1.2s",
          }}
        >
          <div
            style={{
              width: 1,
              height: 56,
              background: "linear-gradient(to bottom, rgba(200,169,110,0.6), rgba(200,169,110,0))",
              animation: "pc-fade-in 1s 1.4s both",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-montserrat)",
              fontSize: 8,
              fontWeight: 300,
              color: "rgba(255,255,255,0.2)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              writingMode: "vertical-rl",
              marginTop: 8,
            }}
          >
            scroll
          </span>
        </div>
      </div>

      {/* Bottom gradient fade into page */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
        style={{ height: 120, background: "linear-gradient(to bottom, transparent, #06060A)" }}
      />
    </div>
  );
}
