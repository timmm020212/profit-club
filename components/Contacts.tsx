export default function Contacts() {
  return (
    <section className="py-20 bg-bg-card border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          {/* Контактная информация */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-8 text-text-primary font-body">
              Контакты
            </h2>
            <div>
              <h3 className="text-sm font-medium mb-2 text-text-secondary uppercase tracking-wide font-body">
                Адрес
              </h3>
              <p className="text-text-primary font-serif">
                г. Москва, ул. Примерная, д. 1
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2 text-text-secondary uppercase tracking-wide font-body">
                Телефон
              </h3>
              <p className="text-text-primary font-serif">
                <a href="tel:+79991234567" className="hover:text-accent-primary transition-colors">
                  +7 (999) 123-45-67
                </a>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2 text-text-secondary uppercase tracking-wide font-body">
                Часы работы
              </h3>
              <p className="text-text-primary font-serif">
                Пн-Вс: 10:00 - 20:00
              </p>
            </div>
          </div>

          {/* Карта - placeholder */}
          <div className="bg-bg-dark rounded-sm overflow-hidden aspect-square border border-border">
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-text-muted text-sm">
                Карта будет здесь
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
