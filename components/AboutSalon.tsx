export default function AboutSalon() {
  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: "Премиальная косметология",
      description: "Современное оборудование и профессиональные процедуры"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Опытные мастера",
      description: "Команда профессионалов с многолетним опытом"
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Индивидуальный подход",
      description: "Персональные программы и внимание к деталям"
    }
  ];

  return (
    <section className="relative w-full bg-white py-16 md:py-20 lg:py-24 z-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 max-w-6xl mx-auto">
          {/* Левая колонка */}
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-thin text-[#2A2A2A] mb-6" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
              О салоне
            </h2>
            
            <div className="space-y-4 mb-8">
              <p className="text-base md:text-lg text-[#2A2A2A]/80 font-light leading-relaxed" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                Profit Club — это премиальный салон красоты, где встречаются современная косметология, 
                искусство парикмахерского дела и фитнес-зона. Мы создали пространство, где каждый клиент 
                получает комплексный уход за собой в одном месте.
              </p>
              
              <p className="text-base md:text-lg text-[#2A2A2A]/80 font-light leading-relaxed" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                Наш салон отличается индивидуальным подходом к каждому гостю, использованием только 
                премиальных материалов и оборудования, а также командой профессионалов, которые 
                постоянно совершенствуют свои навыки.
              </p>
            </div>

            {/* Иконки с особенностями */}
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#E8D5C4]/30 flex items-center justify-center text-[#2A2A2A]">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-medium text-[#2A2A2A] mb-1" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}>
                      {feature.title}
                    </h3>
                    <p className="text-sm md:text-base text-[#2A2A2A]/70 font-light" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Правая колонка - пока пустая */}
          <div>
            {/* Пока оставляем пустым */}
          </div>
        </div>
      </div>
    </section>
  );
}





