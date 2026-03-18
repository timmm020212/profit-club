"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function BarBlock() {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imagePosition, setImagePosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    const updateImageSize = () => {
      if (imageContainerRef.current && containerRef.current) {
        const img = imageContainerRef.current.querySelector('img') as HTMLImageElement;
        if (!img || !img.complete) return;
        
        const imgRect = img.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        
        if (containerRect && img.naturalWidth > 0 && img.naturalHeight > 0) {
          // Вычисляем реальные видимые размеры с учетом object-contain
          const containerWidth = imageContainerRef.current.offsetWidth;
          const containerHeight = imageContainerRef.current.offsetHeight;
          
          const imageAspect = img.naturalWidth / img.naturalHeight;
          const containerAspect = containerWidth / containerHeight;
          
          let displayWidth: number;
          let displayHeight: number;
          
          // Если контейнер шире - изображение масштабируется по высоте
          if (containerAspect > imageAspect) {
            displayHeight = containerHeight;
            displayWidth = displayHeight * imageAspect;
          } else {
            // Если контейнер выше - изображение масштабируется по ширине
            displayWidth = containerWidth;
            displayHeight = displayWidth / imageAspect;
          }
          
          // Вычисляем позицию для центрирования
          const left = (containerWidth - displayWidth) / 2;
          const top = (containerHeight - displayHeight) / 2;
          
          if (displayWidth > 0 && displayHeight > 0) {
            setImageSize({ width: displayWidth, height: displayHeight });
            setImagePosition({ left, top });
          }
        }
      }
    };

    const img = imageContainerRef.current?.querySelector('img') as HTMLImageElement;
    if (img) {
      if (img.complete) {
        setTimeout(updateImageSize, 50);
      } else {
        img.addEventListener('load', () => {
          setTimeout(updateImageSize, 50);
        });
      }
    }
    
    window.addEventListener('resize', updateImageSize);
    const timeout = setTimeout(updateImageSize, 200);
    
    let resizeObserver: ResizeObserver | null = null;
    if (imageContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateImageSize();
      });
      resizeObserver.observe(imageContainerRef.current);
    }
    
    return () => {
      if (img) {
        img.removeEventListener('load', updateImageSize);
      }
      window.removeEventListener('resize', updateImageSize);
      clearTimeout(timeout);
      if (resizeObserver && imageContainerRef.current) {
        resizeObserver.unobserve(imageContainerRef.current);
      }
    };
  }, []);

  return (
    <section className="relative w-full bg-white -mt-16 md:-mt-20 lg:-mt-24 pt-0 pb-8 md:pt-0 md:pb-12 lg:pt-0 lg:pb-16 overflow-visible">
      {/* Контейнер для картинки */}
      <div ref={containerRef} className="relative w-full h-[600px] md:h-[750px] lg:h-[900px] px-4 md:px-6 lg:px-8 overflow-visible">
        {/* Картинка - видна полностью */}
        <div ref={imageContainerRef} className="relative w-full h-full overflow-hidden z-10">
          <Image
            src="/bar-main.jpg"
            alt="Bar"
            fill
            className="object-contain hover:scale-105 transition-transform duration-700"
            priority
            unoptimized={true}
            onLoad={() => {
              setTimeout(() => {
                if (imageContainerRef.current && containerRef.current) {
                  const img = imageContainerRef.current.querySelector('img') as HTMLImageElement;
                  if (!img || !img.complete) return;
                  
                  const containerWidth = imageContainerRef.current.offsetWidth;
                  const containerHeight = imageContainerRef.current.offsetHeight;
                  
                  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    // Вычисляем реальные видимые размеры с учетом object-contain
                    const imageAspect = img.naturalWidth / img.naturalHeight;
                    const containerAspect = containerWidth / containerHeight;
                    
                    let displayWidth: number;
                    let displayHeight: number;
                    
                    // Если контейнер шире - изображение масштабируется по высоте
                    if (containerAspect > imageAspect) {
                      displayHeight = containerHeight;
                      displayWidth = displayHeight * imageAspect;
                    } else {
                      // Если контейнер выше - изображение масштабируется по ширине
                      displayWidth = containerWidth;
                      displayHeight = displayWidth / imageAspect;
                    }
                    
                    // Вычисляем позицию для центрирования
                    const left = (containerWidth - displayWidth) / 2;
                    const top = (containerHeight - displayHeight) / 2;
                    
                    if (displayWidth > 0 && displayHeight > 0) {
                      setImageSize({ width: displayWidth, height: displayHeight });
                      setImagePosition({ left, top });
                    }
                  }
                }
              }, 100);
            }}
          />
        </div>
      </div>
      
      {/* Заголовок отдельно ниже картинки */}
      <div className="relative w-full bg-white -mt-16 md:-mt-20 lg:-mt-24 pb-8 md:pb-10 lg:pb-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-thin text-[#2A2A2A] mb-4" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
            Бар
          </h2>
          {/* Тонкая линия между заголовком и описанием */}
          <div className="w-32 md:w-40 h-px bg-[#2A2A2A]/30 mx-auto mb-4"></div>
          <p className="text-lg md:text-xl lg:text-2xl text-[#2A2A2A]/80 font-light" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
            можно взять напитки
          </p>
        </div>
      </div>
    </section>
  );
}

