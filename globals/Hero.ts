import type { GlobalConfig } from "payload";

export const Hero: GlobalConfig = {
  slug: "hero",
  label: "Героблок",
  fields: [
    { name: "overline", type: "text", label: "Надзаголовок", defaultValue: "Premium Beauty & Fitness" },
    { name: "title1", type: "text", label: "Заголовок (строка 1)", defaultValue: "PROFIT" },
    { name: "title2", type: "text", label: "Заголовок (строка 2)", defaultValue: "CLUB" },
    { name: "subtitle", type: "textarea", label: "Подзаголовок", defaultValue: "Современная косметология, мастера высшей категории и оснащённый фитнес-зал в одном пространстве" },
    { name: "ctaText", type: "text", label: "Кнопка CTA", defaultValue: "Записаться" },
    { name: "ctaLink", type: "text", label: "Ссылка CTA", defaultValue: "/booking" },
    { name: "secondaryText", type: "text", label: "Вторичная ссылка", defaultValue: "Наши услуги ↓" },
    { name: "secondaryLink", type: "text", label: "Ссылка вторичная", defaultValue: "#services" },
    {
      name: "stats",
      type: "array",
      label: "Миниблоки статистики",
      labels: { singular: "Миниблок", plural: "Миниблоки" },
      fields: [
        { name: "value", type: "text", label: "Значение (например: 8+)", required: true },
        { name: "label", type: "text", label: "Текст (например: лет опыта)", required: true },
      ],
    },
  ],
};
