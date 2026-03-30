import type { GlobalConfig } from "payload";

export const Footer: GlobalConfig = {
  slug: "footer",
  label: "Футер",
  access: { read: () => true },
  fields: [
    {
      name: "cta",
      type: "group",
      label: "CTA секция",
      fields: [
        { name: "title", type: "text", label: "Заголовок", defaultValue: "Готовы преобразиться?" },
        { name: "subtitle", type: "text", label: "Подзаголовок", defaultValue: "Запишитесь онлайн — выберите удобное время и мастера за пару кликов" },
        { name: "buttonText", type: "text", label: "Текст кнопки", defaultValue: "Записаться" },
        { name: "buttonLink", type: "text", label: "Ссылка", defaultValue: "/booking" },
      ],
    },
    {
      name: "brand",
      type: "group",
      label: "Бренд",
      fields: [
        { name: "name", type: "text", label: "Название", defaultValue: "PROFIT CLUB" },
        { name: "description", type: "textarea", label: "Описание", defaultValue: "Премиальный салон красоты. Косметология, фитнес и барбершоп в одном пространстве." },
      ],
    },
    {
      name: "serviceLinks",
      type: "array",
      label: "Ссылки услуг",
      fields: [
        { name: "label", type: "text", label: "Текст", required: true },
        { name: "href", type: "text", label: "Ссылка", required: true },
      ],
    },
    {
      name: "infoLinks",
      type: "array",
      label: "Ссылки информации",
      fields: [
        { name: "label", type: "text", label: "Текст", required: true },
        { name: "href", type: "text", label: "Ссылка", required: true },
      ],
    },
    {
      name: "schedule",
      type: "array",
      label: "Расписание",
      fields: [
        { name: "days", type: "text", label: "Дни", required: true },
        { name: "hours", type: "text", label: "Часы", required: true },
      ],
    },
    {
      name: "contacts",
      type: "group",
      label: "Контакты",
      fields: [
        { name: "phone", type: "text", label: "Телефон", defaultValue: "+7 (900) 123-45-67" },
        { name: "address", type: "text", label: "Адрес", defaultValue: "г. Москва, ул. Пример, д. 1" },
        { name: "telegram", type: "text", label: "Telegram" },
        { name: "instagram", type: "text", label: "Instagram" },
      ],
    },
    { name: "copyright", type: "text", label: "Копирайт", defaultValue: "Profit Club. Все права защищены." },
  ],
};
