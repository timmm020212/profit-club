"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function UltraBackgroundSticky() {
  const [topPosition, setTopPosition] = useState(0);
  const sectionTopRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const isStuckToTop = useRef(false);
  const isStuckToBottom = useRef(false);

  useEffect(() => {
    // Находим реальную нижнюю границу секции из DOM
    const bottomMaskElement = document.querySelector('[data-ultra-bottom-mask]') as HTMLElement;
    if (!bottomMaskElement) return;

    const handleScroll = () => {
      if (!sectionTopRef.current || !bottomMaskElement) return;

      const currentScrollY = window.scrollY;
      const scrollDirection = currentScrollY > lastScrollY.current ? 'down' : 'up';
      lastScrollY.current = currentScrollY;

      const topRect = sectionTopRef.current.getBoundingClientRect();
      const bottomRect = bottomMaskElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Если уже прилипло к верху - продолжаем двигаться вместе с секцией при скролле вниз
      if (isStuckToTop.current && scrollDirection === 'down') {
        // Изображение двигается вместе с верхней границей секции с усилением
        // Коэффициент 1.2 делает эффект прилипания сильнее
        setTopPosition(topRect.top * 1.2);
      }
      // Если уже прилипло к низу - продолжаем двигаться вместе с секцией при скролле вверх
      else if (isStuckToBottom.current && scrollDirection === 'up') {
        // Изображение двигается вместе с нижней границей секции
        const bottomOffset = bottomRect.bottom - viewportHeight;
        setTopPosition(bottomOffset);
      }
      // При скролле вниз: начинаем прилипать раньше (когда topRect.top < 150px) для более сильного эффекта
      // Это создает более заметное "примагничивание"
      else if (scrollDirection === 'down' && topRect.top <= 150 && !isStuckToBottom.current) {
        isStuckToTop.current = true;
        isStuckToBottom.current = false;
        // Изображение прилипает и следует за верхней границей секции с усилением
        // Чем ближе к 0, тем сильнее эффект
        const stickinessFactor = topRect.top <= 0 ? 1.2 : 1.0 + (150 - topRect.top) / 150 * 0.2;
        setTopPosition(topRect.top * stickinessFactor);
      }
      // При скролле вверх: момент соприкосновения нижней границы прозрачного блока с нижней границей viewport
      // bottomRect.bottom должен быть на уровне viewportHeight или только что стал больше
      else if (scrollDirection === 'up' && bottomRect.bottom >= viewportHeight && !isStuckToTop.current) {
        isStuckToBottom.current = true;
        isStuckToTop.current = false;
        // Вычисляем позицию: нижняя часть изображения должна совпадать с нижней границей секции
        // topPosition + viewportHeight = bottomRect.bottom
        // topPosition = bottomRect.bottom - viewportHeight
        const bottomOffset = bottomRect.bottom - viewportHeight;
        setTopPosition(bottomOffset);
      }
      // Если скролл в противоположную сторону от прилипания - отлипаем
      else if ((scrollDirection === 'up' && isStuckToTop.current) || (scrollDirection === 'down' && isStuckToBottom.current)) {
        isStuckToTop.current = false;
        isStuckToBottom.current = false;
        setTopPosition(0);
      }
      // Если условия не выполнены - изображение статично
      else {
        setTopPosition(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll(); // Вызываем сразу для начального состояния

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <>
      {/* Фоновое изображение - прилипает к границам прозрачного блока при скролле */}
      <div 
        ref={imageRef}
        className="ultra-background-sticky"
          style={{
          position: 'fixed',
          top: `${topPosition}px`,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          pointerEvents: 'none',
          transition: 'top 0.1s ease-out'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/ultra-new.png"
            alt="Ultra background"
            width={1920}
            height={1080}
            className="w-auto h-full object-contain"
            style={{ transform: 'scale(1.5)' }}
            priority
            unoptimized={true}
          />
        </div>
      </div>

      {/* Скрытая секция для отслеживания верхней границы прозрачного блока */}
      <div ref={sectionTopRef} className="relative w-full pointer-events-none">
        {/* Верхнее белое поле (маска) - скрывает изображение сверху */}
        <div className="ultra-mask w-full h-0"></div>
      </div>
    </>
  );
}

