import type { GlobalConfig } from "payload";

export const Marquee: GlobalConfig = {
  slug: "marquee",
  label: "Бегущая строка",
  access: { read: () => true },
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
