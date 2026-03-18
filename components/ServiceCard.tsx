"use client";

import Image from "next/image";
import Link from "next/link";

interface ServiceCardProps {
  name: string;
  description: string;
  price?: string;
  imageUrl?: string;
  badge?: {
    text: string;
    type: 'dark' | 'light' | 'accent' | 'discount';
  };
}

export default function ServiceCard({ name, description, price, imageUrl, badge }: ServiceCardProps) {
  const getBadgeClass = () => {
    switch (badge?.type) {
      case 'dark':
        return 'bg-badge-dark text-text-primary border border-border';
      case 'light':
        return 'bg-badge-light text-text-primary';
      case 'accent':
        return 'bg-badge-accent text-white';
      case 'discount':
        return 'bg-accent-primary text-white';
      default:
        return 'bg-badge-dark text-text-primary border border-border';
    }
  };

  return (
    <div className="group relative rounded-lg overflow-hidden border border-amber-200/30 hover:border-amber-200/50 transition-all duration-300 bg-[#E8D5C4]">
      {/* Фото услуги */}
      <div className="aspect-square relative overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            quality={100}
            unoptimized={true}
          />
        ) : (
          <div className="w-full h-full bg-bg-hover"></div>
        )}
        {badge && (
          <div className={`absolute top-3 right-3 px-3 py-1 rounded-sm text-xs font-medium z-10 font-body ${getBadgeClass()}`}>
            {badge.text}
          </div>
        )}
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-medium mb-2 text-[#2A2A2A] font-body">
          {name}
        </h3>
        <p className="text-sm text-[#4A4A4A] mb-4 line-clamp-2 font-serif">
          {description}
        </p>
        {price && (
          <div className="text-base font-medium text-[#2A2A2A] mb-4 font-body">
            {price}
          </div>
        )}
        <Link 
          href="/booking"
          className="w-full bg-[#6B8E6B] hover:bg-[#5F7F5F] text-white font-medium py-3 px-6 rounded-full text-sm transition-colors duration-300 font-body shadow-md shadow-[#6B8E6B]/30 inline-block text-center"
        >
          Записаться
        </Link>
      </div>
    </div>
  );
}
