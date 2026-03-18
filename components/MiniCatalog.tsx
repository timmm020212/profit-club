"use client";

type MiniCatalogProps = {
  categories: string[];
  selected?: string | null;
  onSelect?: (name: string) => void;
};

export default function MiniCatalog({ categories, selected, onSelect }: MiniCatalogProps) {
  return (
    <section className="py-10">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {categories.map((name) => {
            const isActive = selected === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onSelect?.(name)}
                className={[
                  "relative w-full h-40 md:h-44 text-left rounded-md",
                  "bg-bg-card hover:bg-bg-hover border transition-colors",
                  isActive ? "border-accent-primary" : "border-border",
                ].join(" ")}
              >
                <span className="absolute top-3 left-3 text-text-primary text-base md:text-lg font-medium font-body">
                  {name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}


