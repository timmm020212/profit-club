"use client";

import { useMemo, useState } from "react";
import MiniCatalog from "./MiniCatalog";
import ServiceCard from "./ServiceCard";

type Service = {
  id: number;
  name: string;
  description: string;
  price: string | null;
  badgeText: string | null;
  badgeType: "dark" | "light" | "accent" | "discount" | null;
};

type ServicesSectionProps = {
  servicesData: Service[];
};

const CATEGORY_MAP: Record<string, string[]> = {
  "Стрижки": ["стрижк"],
  "Окрашивание": ["окраш"],
  "Укладка": ["уклад"],
  "Маникюр": ["маникюр"],
  "Педикюр": ["педикюр"],
  "Макияж": ["макияж"],
};

const CATEGORIES = Object.keys(CATEGORY_MAP);

export default function ServicesSection({ servicesData }: ServicesSectionProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!selected) return [];
    const needles = CATEGORY_MAP[selected] || [];
    const lower = (s: string) => s.toLowerCase();
    return servicesData.filter((s) =>
      needles.some((n) => lower(s.name).includes(n) || lower(s.description).includes(n))
    );
  }, [servicesData, selected]);

  return (
    <>
      <MiniCatalog
        categories={CATEGORIES}
        selected={selected}
        onSelect={(name) => setSelected(name)}
      />

      {selected && (
        <section id="services" className="py-16 border-t border-[#E5E5E5]/60">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6 max-w-7xl mx-auto">
              {filtered.map((service) => (
                <ServiceCard
                  key={service.id}
                  name={service.name}
                  description={service.description}
                  price={service.price || undefined}
                  badge={
                    service.badgeText && service.badgeType
                      ? {
                          text: service.badgeText,
                          type: service.badgeType as "dark" | "light" | "accent" | "discount",
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}







