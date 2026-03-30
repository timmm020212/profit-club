import type { GlobalConfig } from "payload";

export const Marquee: GlobalConfig = {
  slug: "marquee",
  label: "Бегущая строка",
  fields: [
    {
      name: "items",
      type: "array",
      label: "Элементы",
      fields: [
        { name: "text", type: "text", label: "Текст", required: true },
      ],
    },
  ],
};
