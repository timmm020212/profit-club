"use client";

import { useState, useEffect } from "react";

type SearchBarProps = {
  onSearch: (query: string) => void;
  onFocus?: () => void;
  searchQuery?: string;
};

export default function SearchBar({ onSearch, onFocus, searchQuery = "" }: SearchBarProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    onSearch(value);
  };

  const handleFocus = () => {
    if (onFocus) {
      onFocus();
    }
  };

  return (
    <div className="pt-4 pb-2">
      <div className="container mx-auto px-4">
        <div className="relative">
            <input
              type="text"
              placeholder="Поиск услуг..."
              value={localQuery}
              onChange={handleChange}
              onFocus={handleFocus}
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
  );
}

