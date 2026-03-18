"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import BookingServiceCard from "./BookingServiceCard";

const BookingModal = dynamic(() => import("./BookingModal"), { ssr: false });

interface Service {
  id: number;
  name: string;
  description: string;
  price?: string | null;
  imageUrl?: string | null;
  duration?: number | string | null;
  category?: string | null;
  executorRole?: string | null;
  badgeText?: string | null;
  badgeType?: 'dark' | 'light' | 'accent' | 'discount' | null;
}

export default function BookingServicesGrid() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeService, setActiveService] = useState<Service | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B2223C]" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#2A2A2A]/60" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
          Услуги не найдены
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {services.map((service) => (
          <BookingServiceCard
            key={service.id}
            id={service.id}
            name={service.name}
            description={service.description}
            price={service.price}
            imageUrl={service.imageUrl}
            duration={service.duration}
            category={service.category}
            badgeText={service.badgeText}
            badgeType={service.badgeType}
            onBook={() => setActiveService(service)}
          />
        ))}
      </div>

      {activeService && (
        <BookingModal
          service={activeService}
          onClose={() => setActiveService(null)}
        />
      )}
    </>
  );
}
