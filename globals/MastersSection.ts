import type { GlobalConfig } from "payload";

export const MastersSection: GlobalConfig = {
  slug: "masters_section",
  label: "Секция мастеров",
  access: { read: () => true },
  fields: [
    { name: "overline", type: "text", label: "Надзаголовок", defaultValue: "Команда" },
    { name: "title", type: "text", label: "Заголовок", defaultValue: "Наши мастера" },
    { name: "subtitle", type: "textarea", label: "Подзаголовок", defaultValue: "Каждый специалист — профессионал с подтверждённой квалификацией и собственным подходом к работе." },
  ],
};
