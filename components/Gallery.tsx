export default function Gallery() {
  const galleryItems = Array.from({ length: 6 }, (_, i) => i + 1);

  return (
    <section className="py-20 bg-bg-dark">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-text-primary font-body">
          Наши работы
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {galleryItems.map((item) => (
            <div
              key={item}
              className="aspect-square bg-bg-card rounded-sm overflow-hidden group cursor-pointer border border-border"
            >
              <div className="w-full h-full bg-bg-hover flex items-center justify-center group-hover:opacity-80 transition-opacity duration-300">
                <span className="text-text-muted text-sm">Фото {item}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
