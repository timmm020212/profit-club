"use client";

import { useState, useMemo } from "react";
import ServiceCard from "./ServiceCard";
import SearchBar from "./SearchBar";

type Service = {
  id: number;
  name: string;
  description: string;
  price: string | null;
  imageUrl?: string | null;
  badgeText: string | null;
  badgeType: "dark" | "light" | "accent" | "discount" | null;
};

type ServiceCategoriesProps = {
  servicesData: Service[];
};

const CATEGORY_MAP: Record<string, string[]> = {
  "Стрижки": ["стрижк"],
  "Окрашивание": ["окраш", "мелир"],
  "Укладки": ["уклад"],
  "Маникюр": ["маникюр"],
  "Педикюр": ["педикюр"],
  "Макияж": ["макияж"],
};

const categories = [
  {
    name: "Стрижки",
    description: "Мужские и женские стрижки любой сложности",
  },
  {
    name: "Окрашивание",
    description: "Профессиональное окрашивание волос",
  },
  {
    name: "Укладки",
    description: "Свадебные и праздничные укладки",
  },
  {
    name: "Маникюр",
    description: "Классический и аппаратный маникюр",
  },
  {
    name: "Педикюр",
    description: "Уход за ногами и ногтями",
  },
  {
    name: "Макияж",
    description: "Дневной и вечерний макияж",
  },
];

export default function ServiceCategories({ servicesData }: ServiceCategoriesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  const filteredServices = useMemo(() => {
    let filtered = servicesData;

    // Фильтр по категории
    if (selectedCategory) {
      const needles = CATEGORY_MAP[selectedCategory] || [];
      const lower = (s: string) => s.toLowerCase();
      filtered = filtered.filter((s) =>
        needles.some((n) => lower(s.name).includes(n) || lower(s.description).includes(n))
      );
    }

    // Фильтр по поисковому запросу
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [servicesData, selectedCategory, searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setSelectedCategory(null);
    }
  };

  const handleSearchFocus = () => {
    setIsSearchModalOpen(true);
  };

  const handleCloseSearchModal = () => {
    setIsSearchModalOpen(false);
    setSearchQuery("");
    setSelectedCategory(null);
  };

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSearchQuery("");
  };

  // Модальное окно поиска
  if (isSearchModalOpen) {
    return (
      <div className="fixed inset-0 bg-white z-[100] overflow-y-auto">
        <div className="min-h-screen">
          {/* Кнопка возврата и поле поиска */}
          <div className="pt-4 pb-4">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3">
                {/* Кнопка возврата в каталог */}
                <button
                  onClick={handleCloseSearchModal}
                  className="flex items-center justify-center p-2.5 text-gray-700 hover:text-[#6B8E6B] transition-colors duration-300 group"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-6 h-6 group-hover:-translate-x-1 transition-transform duration-300"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                    />
                  </svg>
                </button>

                {/* Поле поиска */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Поиск услуг..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    autoFocus
                    className="w-full bg-white border border-gray-300 rounded-lg py-3 px-4 pl-12 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#6B8E6B] transition-colors duration-300 font-body"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Результаты поиска - пока пусто */}
          {searchQuery.trim() && (
            <div className="container mx-auto px-4 pb-20">
              <div className="max-w-2xl mx-auto">
                {filteredServices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServices.map((service) => (
                      <ServiceCard
                        key={service.id}
                        name={service.name}
                        description={service.description}
                        price={service.price || undefined}
                        imageUrl={service.imageUrl || undefined}
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
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600 text-lg font-body">
                      Ничего не найдено
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Если выбрана категория или есть поисковый запрос - показываем услуги
  if (selectedCategory || searchQuery.trim()) {
    return (
      <>
        <SearchBar onSearch={handleSearch} onFocus={handleSearchFocus} searchQuery={searchQuery} />
        <section className="pt-4 pb-20">
          <div className="container mx-auto px-4">
            {/* Кнопка возврата в каталог */}
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSearchQuery("");
              }}
              className="flex items-center gap-2 text-gray-700 hover:text-[#6B8E6B] transition-colors duration-300 mb-8 group"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              <span className="text-lg font-medium font-body">Каталог</span>
            </button>

            {/* Карточки услуг */}
            {filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    name={service.name}
                    description={service.description}
                    price={service.price || undefined}
                    imageUrl={service.imageUrl || undefined}
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
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg font-body">
                  Ничего не найдено
                </p>
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  // Иначе показываем категории (как было изначально)
  return (
    <>
      <SearchBar onSearch={handleSearch} onFocus={handleSearchFocus} searchQuery={searchQuery} />
      <section className="pt-4 pb-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <div
                key={index}
                onClick={() => handleCategoryClick(category.name)}
                className="p-8 rounded-lg border border-gray-300 hover:border-gray-400 transition-all duration-300 cursor-pointer bg-white shadow-sm"
              >
                <h3 className="text-2xl font-semibold mb-3 text-gray-900 font-body">
                  {category.name}
                </h3>
                <p className="text-gray-600 font-serif">{category.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

