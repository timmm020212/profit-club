"use client";

import Image from "next/image";

export default function UltraMaskSection() {
  return (
    <>
      {/* Фоновое изображение - закреплено на заднем слое, статично при скролле */}
      <div className="ultra-background">
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/ultra.png"
            alt="Ultra background"
            width={1920}
            height={1080}
            className="w-auto h-full object-contain"
            priority
            unoptimized={true}
          />
        </div>
      </div>

      {/* Секция с окном просмотра - в центре белого поля */}
      <section className="relative w-full">
        {/* Верхнее белое поле (маска) - скрывает изображение сверху */}
        <div className="ultra-mask w-full h-0"></div>
        
        {/* Прозрачное окно - дыра в белом поле, через которую видно fixed изображение */}
        <div className="flex justify-center">
          <div className="ultra-viewport w-3/4 md:w-2/3 lg:w-1/2 h-[400px] md:h-[500px] lg:h-[600px] relative">
            {/* Через этот прозрачный контейнер видно fixed изображение на заднем плане */}
          </div>
        </div>
        
        {/* Нижнее белое поле (маска) - скрывает изображение снизу */}
        <div className="ultra-mask w-full h-16 md:h-20 lg:h-24"></div>
      </section>
    </>
  );
}
