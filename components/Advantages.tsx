export default function Advantages() {
  const advantages = [
    {
      title: "Опытные мастера",
      description: "Профессионалы с многолетним опытом",
    },
    {
      title: "Премиум-услуги",
      description: "Только качественные материалы",
    },
    {
      title: "Индивидуальный подход",
      description: "Учитываем ваши пожелания",
    },
    {
      title: "Удобное расположение",
      description: "В центре города",
    },
  ];

  return (
    <section className="py-20 bg-bg-dark">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {advantages.map((advantage, index) => (
            <div
              key={index}
              className="text-center"
            >
              <h3 className="text-lg font-medium mb-2 text-text-primary font-body">
                {advantage.title}
              </h3>
              <p className="text-sm text-text-muted font-serif">{advantage.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
