"use client";

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-bg-dark overflow-hidden">
      {/* Тёмный фон с градиентом */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg-dark via-bg-dark to-bg-card opacity-90"></div>
      
      {/* Контент */}
      <div className="relative z-10 container mx-auto px-4 text-center max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-text-primary tracking-tight font-body">
          Profit Club
        </h1>
        <p className="text-xl md:text-2xl mb-10 text-text-secondary max-w-2xl mx-auto font-light font-serif">
          Премиальный салон красоты с индивидуальным подходом
        </p>
        <button className="bg-accent-primary hover:bg-accent-hover text-white font-medium py-4 px-12 rounded-sm text-lg transition-colors duration-300 tracking-wide font-body shadow-lg shadow-black/30">
          Записаться
        </button>
      </div>
    </section>
  );
}
