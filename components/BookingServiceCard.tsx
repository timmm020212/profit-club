import Image from "next/image";

interface BookingServiceCardProps {
  id: number;
  name: string;
  description: string;
  price?: string | null;
  imageUrl?: string | null;
  duration?: number | string | null;
  category?: string | null;
  badgeText?: string | null;
  badgeType?: 'dark' | 'light' | 'accent' | 'discount' | null;
  onBook: () => void;
}

const BookingServiceCard: React.FC<BookingServiceCardProps> = ({
  name,
  description,
  price,
  imageUrl,
  duration,
  category,
  badgeText,
  badgeType,
  onBook,
}) => {
  const getBadgeClass = () => {
    switch (badgeType) {
      case 'dark': return 'bg-badge-dark text-text-primary border border-border';
      case 'light': return 'bg-badge-light text-text-primary';
      case 'accent': return 'bg-badge-accent text-white';
      case 'discount': return 'bg-accent-primary text-white';
      default: return 'bg-badge-dark text-text-primary border border-border';
    }
  };

  const durationLabel = duration ? `${duration} мин` : null;

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 hover:border-gray-200 h-full flex flex-col">
      {/* Image */}
      <div className="relative h-64 md:h-72 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width:768px) 100vw, 50vw"
            quality={90}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#E8D5C4] to-[#D4C4B0]">
            <span className="text-[#2A2A2A]/40 text-4xl" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
              {name.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {badgeText && (
          <div className={`absolute top-4 right-4 z-10 px-3 py-1.5 rounded-sm text-xs font-medium ${getBadgeClass()}`}
               style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}>
            {badgeText}
          </div>
        )}
        {category && (
          <div className="absolute top-4 left-4 z-10">
            <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-[#2A2A2A] text-xs font-medium rounded-full"
                  style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}>
              {category}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 md:p-6 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg md:text-xl font-medium text-[#2A2A2A] mb-2.5 leading-tight min-w-0"
              style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}>
            {name}
          </h3>
          {durationLabel && (
            <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-xs text-[#2A2A2A]/70 whitespace-nowrap flex-shrink-0"
                 style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 400 }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {durationLabel}
            </div>
          )}
        </div>

        <p className="text-sm text-[#2A2A2A]/65 mb-4 leading-relaxed line-clamp-3 h-12"
           style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
          {description}
        </p>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 mt-auto">
          {price && (
            <span className="text-lg font-semibold text-[#2A2A2A] tabular-nums"
                  style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 600 }}>
              {price}
            </span>
          )}
          <button
            type="button"
            onClick={onBook}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#B2223C] text-white shadow-lg shadow-[#B2223C]/20 hover:bg-[#9a1b32] hover:shadow-[#B2223C]/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ml-auto"
            style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 500 }}
          >
            <span>Записаться</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingServiceCard;
