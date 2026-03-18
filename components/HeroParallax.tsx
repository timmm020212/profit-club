"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Header from "./Header";

export default function HeroParallax() {
  const imageRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Добавляем обработчик скролла
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // Вызываем сразу для начальной позиции
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Вычисляем смещение для параллакс-эффекта (легкое движение вниз при скролле)
  // Коэффициент 0.3 означает, что изображение будет двигаться медленнее, чем скролл
  const parallaxOffset = scrollY * 0.3;

  return (
    <div className="relative w-full overflow-hidden">
      {/* Изображение с параллакс-эффектом */}
      <div 
        ref={imageRef}
        className="relative w-full"
        style={{
          transform: `translateY(${parallaxOffset}px)`,
          transition: "transform 0.1s ease-out",
        }}
      >
        <Image
          src="/hero-image.png"
          alt="Hero"
          width={1920}
          height={1080}
          className="w-full h-auto object-cover"
          priority
          unoptimized={true}
        />
      </div>
      
      {/* Затемнение */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
      
      {/* Текст поверх изображения */}
      <div className="absolute inset-0 flex flex-col items-start justify-center text-left px-4 md:px-8 lg:px-12 z-10">
        <h1 className="text-5xl md:text-7xl lg:text-8xl text-white mb-4 font-thin pointer-events-none" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
          ПРОФИТ КЛУБ
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-thin mb-8 pointer-events-none" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
          современная косметология, мастера, фитнес зал
        </p>
        <a 
          href="/booking"
          className="bg-accent-primary hover:bg-accent-hover text-white font-medium py-4 px-12 rounded-sm text-lg transition-all duration-300 tracking-wide font-body shadow-lg shadow-black/30 inline-flex items-center gap-3 group"
        >
          <span>Записаться</span>
          <svg 
            className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
      
      {/* Шапка поверх изображения */}
      <div className="absolute top-0 left-0 w-full z-20">
        <Header />
      </div>
    </div>
  );
}

