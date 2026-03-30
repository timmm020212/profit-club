import type { GlobalConfig } from "payload";

export const ServicesSection: GlobalConfig = {
  slug: "services_section",
  label: "Секция услуг",
  access: { read: () => true },
  fields: [
    { name: "overline", type: "text", label: "Надзаголовок", defaultValue: "Каталог" },
    { name: "title", type: "text", label: "Заголовок", defaultValue: "Наши услуги" },
    { name: "subtitle", type: "textarea", label: "Подзаголовок", defaultValue: "Выберите процедуру, подберите удобное время и запишитесь онлайн. Каждая услуга выполняется сертифицированным специалистом." },
  ],
};
