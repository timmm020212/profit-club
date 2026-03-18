"use client";

import BookingServicesGrid from "./BookingServicesGrid";

const ServiceGrid = () => {
  return (
    <section id="services" className="bg-[#F4F3F0]">
      <div className="mx-auto max-w-screen-xl px-3 sm:px-4 lg:px-6 pt-0 pb-10 md:pb-14">
        <BookingServicesGrid />
      </div>
    </section>
  );
};

export default ServiceGrid;
