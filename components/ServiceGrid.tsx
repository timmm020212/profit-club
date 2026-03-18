"use client";

import BookingServicesGrid from "./BookingServicesGrid";

const ServiceGrid = () => {
  return (
    <section className="py-16 px-4 md:px-8 lg:px-12 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#2A2A2A] mb-4" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 700 }}>
            Наши услуги
          </h2>
          <p className="text-lg text-[#2A2A2A]/70 max-w-2xl mx-auto" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
            Откройте для себя мир профессиональных услуг в нашем салоне. Мы предлагаем широкий выбор процедур для вашей красоты и здоровья.
          </p>
        </div>
        
        <BookingServicesGrid />
      </div>
    </section>
  );
};

export default ServiceGrid;
