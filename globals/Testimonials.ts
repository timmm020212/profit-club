import type { GlobalConfig } from "payload";

export const Testimonials: GlobalConfig = {
  slug: "testimonials",
  label: "Отзывы",
  fields: [
    { name: "overline", type: "text", label: "Надзаголовок", defaultValue: "Отзывы" },
    { name: "title", type: "text", label: "Заголовок", defaultValue: "Что говорят клиенты" },
    {
      name: "items",
      type: "array",
      label: "Отзывы",
      fields: [
        { name: "name", type: "text", label: "Имя", required: true },
        { name: "service", type: "text", label: "Услуга", required: true },
        { name: "text", type: "textarea", label: "Текст отзыва", required: true },
        { name: "rating", type: "number", label: "Рейтинг (1-5)", min: 1, max: 5, defaultValue: 5 },
      ],
    },
  ],
};
