import type { GlobalConfig } from "payload";

export const Philosophy: GlobalConfig = {
  slug: "philosophy",
  label: "Философия",
  access: { read: () => true },
  fields: [
    { name: "overline", type: "text", label: "Надзаголовок", defaultValue: "Наша философия" },
    { name: "title", type: "text", label: "Заголовок", defaultValue: "Пространство, где рождается красота" },
    { name: "subtitle", type: "textarea", label: "Подзаголовок", defaultValue: "Profit Club — это не просто салон. Это экосистема, в которой косметология, фитнес и барбершоп объединены в единое целое. Мы верим, что забота о себе должна быть удовольствием, а не рутиной." },
    {
      name: "pillars",
      type: "array",
      label: "Столпы",
      fields: [
        { name: "title", type: "text", label: "Заголовок", required: true },
        { name: "text", type: "textarea", label: "Описание", required: true },
      ],
    },
  ],
};
