import type { GlobalConfig } from "payload";

export const Zones: GlobalConfig = {
  slug: "zones",
  label: "Зоны",
  fields: [
    { name: "overline", type: "text", label: "Надзаголовок", defaultValue: "Пространства" },
    { name: "title", type: "text", label: "Заголовок", defaultValue: "Три зоны — одна цель" },
    {
      name: "zones",
      type: "array",
      label: "Зоны",
      fields: [
        { name: "title", type: "text", label: "Название", required: true },
        { name: "subtitle", type: "text", label: "Подзаголовок" },
        { name: "description", type: "textarea", label: "Описание", required: true },
        { name: "image", type: "text", label: "Путь к изображению" },
        { name: "color", type: "text", label: "Цвет (hex)", defaultValue: "#B2223C" },
        {
          name: "features",
          type: "array",
          label: "Фичи",
          fields: [
            { name: "text", type: "text", label: "Текст", required: true },
          ],
        },
      ],
    },
  ],
};
