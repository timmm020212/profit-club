import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { fileURLToPath } from "url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: "super-admins",
    meta: {
      titleSuffix: " — Profit Club",
    },
    routes: {
      login: "/login",
    },
  },
  routes: {
    admin: "/super-admin",
    api: "/api/payload",
  },

  collections: [
    // Super Admin users
    {
      slug: "super-admins",
      auth: true,
      admin: {
        useAsTitle: "email",
      },
      fields: [
        { name: "name", type: "text", required: true },
        { name: "role", type: "select", options: ["superadmin", "manager"], defaultValue: "manager" },
      ],
    },

    // Services management
    {
      slug: "managed-services",
      admin: {
        useAsTitle: "name",
        group: "Букинг",
      },
      fields: [
        { name: "name", type: "text", required: true, label: "Название" },
        { name: "description", type: "textarea", required: true, label: "Описание" },
        { name: "price", type: "text", label: "Цена" },
        { name: "duration", type: "number", required: true, defaultValue: 60, label: "Длительность (мин)" },
        { name: "category", type: "select", label: "Категория", options: [
          "Парикмахерские услуги", "Ногтевой сервис", "Массаж", "Косметология",
          "Фитнес", "Брови и ресницы", "Эпиляция", "СПА", "Перманентный макияж",
        ]},
        { name: "executorRole", type: "select", label: "Роль исполнителя", options: [
          "парикмахер", "мастер ногтевого сервиса", "массажист", "косметолог",
          "тренер", "мастер бровей", "мастер эпиляции", "специалист", "мастер татуажа",
        ]},
        { name: "image", type: "upload", relationTo: "media", label: "Фото" },
        { name: "badgeText", type: "text", label: "Badge текст" },
        { name: "badgeType", type: "select", label: "Badge тип", options: [
          { label: "Акцент", value: "accent" },
          { label: "Скидка", value: "discount" },
          { label: "Тёмный", value: "dark" },
          { label: "Светлый", value: "light" },
        ]},
        { name: "orderDesktop", type: "number", defaultValue: 0, label: "Порядок (десктоп)" },
        { name: "orderMobile", type: "number", defaultValue: 0, label: "Порядок (мобильный)" },
      ],
    },

    // Masters management
    {
      slug: "managed-masters",
      admin: {
        useAsTitle: "fullName",
        group: "Букинг",
      },
      fields: [
        { name: "fullName", type: "text", required: true, label: "ФИО" },
        { name: "specialization", type: "text", required: true, label: "Специализация" },
        { name: "phone", type: "text", label: "Телефон" },
        { name: "telegramId", type: "text", label: "Telegram ID" },
        { name: "photo", type: "upload", relationTo: "media", label: "Фото" },
        { name: "showOnSite", type: "checkbox", defaultValue: true, label: "Показывать на сайте" },
        { name: "isActive", type: "checkbox", defaultValue: true, label: "Активен" },
      ],
    },

    // Media uploads
    {
      slug: "media",
      upload: {
        staticDir: path.resolve(dirname, "public/uploads/payload"),
        mimeTypes: ["image/*"],
      },
      fields: [
        { name: "alt", type: "text", label: "Alt текст" },
      ],
    },

    // Bot settings
    {
      slug: "bot-settings",
      admin: {
        group: "Настройки",
      },
      fields: [
        { name: "key", type: "text", required: true, unique: true, label: "Ключ" },
        { name: "value", type: "textarea", label: "Значение" },
        { name: "description", type: "text", label: "Описание" },
      ],
    },

    // Landing page content
    {
      slug: "landing-blocks",
      admin: {
        useAsTitle: "blockName",
        group: "Контент",
      },
      fields: [
        { name: "blockName", type: "text", required: true, label: "Название блока" },
        { name: "blockType", type: "select", required: true, label: "Тип", options: [
          "hero", "marquee", "services", "philosophy", "zones", "process", "masters", "testimonials", "footer",
        ]},
        { name: "title", type: "text", label: "Заголовок" },
        { name: "subtitle", type: "text", label: "Подзаголовок" },
        { name: "content", type: "richText", label: "Контент" },
        { name: "isVisible", type: "checkbox", defaultValue: true, label: "Видимый" },
        { name: "order", type: "number", defaultValue: 0, label: "Порядок" },
      ],
    },
  ],

  editor: lexicalEditor(),

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || "",
      ssl: { rejectUnauthorized: false },
    },
    push: false,
  }),

  secret: process.env.PAYLOAD_SECRET || "super-secret-payload-key-change-in-production",

  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
