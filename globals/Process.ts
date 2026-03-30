import type { GlobalConfig } from "payload";

export const Process: GlobalConfig = {
  slug: "process",
  label: "Как записаться",
  access: { read: () => true },
  fields: [
    { name: "overline", type: "text", label: "Надзаголовок", defaultValue: "Как записаться" },
    { name: "title", type: "text", label: "Заголовок", defaultValue: "Четыре простых шага" },
    { name: "ctaText", type: "text", label: "Кнопка CTA", defaultValue: "Записаться сейчас" },
    { name: "ctaLink", type: "text", label: "Ссылка CTA", defaultValue: "/booking" },
    {
      name: "steps",
      type: "array",
      label: "Шаги",
      fields: [
        { name: "number", type: "text", label: "Номер" },
        { name: "title", type: "text", label: "Заголовок", required: true },
        { name: "text", type: "textarea", label: "Описание", required: true },
      ],
    },
  ],
};
