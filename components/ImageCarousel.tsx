"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const carouselImages = [
  "/carousel/bandag.jpg",
  "/carousel/beverly.jpg",
  "/carousel/coccon-slide.jpg",
  "/carousel/curacen.jpg",
  "/carousel/heleo1.jpg",
  "/carousel/img_3523.jpg",
  "/carousel/img_9064.jpg",
  "/carousel/lumn.jpg",
  "/carousel/profihlo1.jpg",
  "/carousel/ulfit1.jpg",
];

export default function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? carouselImages.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  // Автоматическая смена изображений каждые 7 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full max-w-full bg-white overflow-hidden">
      {/* Бесконечный текст сверху */}
      <div className="relative w-full overflow-hidden py-1 px-4">
        <div className="flex animate-scroll whitespace-nowrap">
          {Array.from({ length: 30 }).map((_, i) => (
            <span key={i} className="inline-block mx-8 text-gray-400 text-sm md:text-base font-thin" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
              PROFIT CLUB <span className="mx-2">•</span>
            </span>
          ))}
          {Array.from({ length: 30 }).map((_, i) => (
            <span key={`dup-${i}`} className="inline-block mx-8 text-gray-400 text-sm md:text-base font-thin" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
              PROFIT CLUB <span className="mx-2">•</span>
            </span>
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-full h-[150px] md:h-[280px] lg:h-[360px] overflow-hidden">
        {/* Изображение */}
        <Image
          src={carouselImages[currentIndex]}
          alt={`Carousel image ${currentIndex + 1}`}
          fill
          className="object-contain w-full h-full"
          priority={currentIndex === 0}
          unoptimized={true}
          sizes="100vw"
        />

        {/* Стрелка влево */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-gray-800 p-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
          aria-label="Previous image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>

        {/* Стрелка вправо */}
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white text-gray-800 p-3 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
          aria-label="Next image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>

        {/* Индикаторы */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Бесконечный текст снизу */}
      <div className="relative w-full overflow-hidden py-1">
        <div className="w-full px-4 overflow-hidden">
          <div className="flex animate-scroll-reverse whitespace-nowrap">
          {Array.from({ length: 30 }).map((_, i) => (
            <span key={i} className="inline-block mx-8 text-gray-400 text-sm md:text-base font-thin" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
              PROFIT CLUB <span className="mx-2">•</span>
            </span>
          ))}
          {Array.from({ length: 30 }).map((_, i) => (
            <span key={`dup-${i}`} className="inline-block mx-8 text-gray-400 text-sm md:text-base font-thin" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
              PROFIT CLUB <span className="mx-2">•</span>
            </span>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}

