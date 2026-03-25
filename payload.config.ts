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
    api: "/payload-api",
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

    // Services management — connected to existing "services" table
    {
      slug: "managed-services",
      dbName: "services",
      timestamps: false,
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
        { name: "imageUrl", type: "text", label: "URL фото" },
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

    // Masters management — connected to existing "masters" table
    {
      slug: "managed-masters",
      dbName: "masters",
      timestamps: false,
      admin: {
        useAsTitle: "fullName",
        group: "Букинг",
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            if (!data) return data;
            const settings: Record<string, boolean> = {};
            for (const key of ["newAppointments", "cancellations", "breaks", "morningReminder"]) {
              if (key in data) {
                settings[key] = !!data[key];
                delete data[key];
              }
            }
            if (Object.keys(settings).length > 0) {
              let existing: Record<string, boolean> = {};
              try { if (data.notificationSettings) existing = JSON.parse(data.notificationSettings); } catch {}
              data.notificationSettings = JSON.stringify({ ...existing, ...settings });
            }
            return data;
          },
        ],
        afterRead: [
          ({ doc }) => {
            if (!doc) return doc;
            const defaults = { newAppointments: true, cancellations: true, breaks: true, morningReminder: false };
            let settings = defaults;
            try { if (doc.notificationSettings) settings = { ...defaults, ...JSON.parse(doc.notificationSettings) }; } catch {}
            doc.newAppointments = settings.newAppointments;
            doc.cancellations = settings.cancellations;
            doc.breaks = settings.breaks;
            doc.morningReminder = settings.morningReminder;
            return doc;
          },
        ],
      },
      fields: [
        { name: "fullName", type: "text", required: true, label: "ФИО" },
        { name: "specialization", type: "select", required: true, label: "Специализация", options: [
          "парикмахер", "мастер ногтевого сервиса", "массажист", "косметолог",
          "тренер", "мастер бровей", "мастер эпиляции", "специалист", "мастер татуажа",
        ]},
        { name: "phone", type: "text", label: "Телефон" },
        { name: "telegramId", type: "text", label: "Telegram ID" },
        { name: "photoUrl", type: "text", label: "URL фото" },
        { name: "showOnSite", type: "checkbox", defaultValue: true, label: "Показывать на сайте" },
        { name: "isActive", type: "checkbox", defaultValue: true, label: "Активен" },
        { name: "newAppointments", type: "checkbox", defaultValue: true, label: "🔔 Новые записи",
          admin: { position: "sidebar", description: "Уведомления о новых записях клиентов" },
          virtual: true,
        },
        { name: "cancellations", type: "checkbox", defaultValue: true, label: "❌ Отмены записей",
          admin: { position: "sidebar", description: "Уведомления об отмене записей" },
          virtual: true,
        },
        { name: "breaks", type: "checkbox", defaultValue: true, label: "⏸️ Перерывы",
          admin: { position: "sidebar", description: "Уведомления о перерывах в расписании" },
          virtual: true,
        },
        { name: "morningReminder", type: "checkbox", defaultValue: false, label: "🌅 Утреннее напоминание",
          admin: { position: "sidebar", description: "Утренняя сводка расписания на день" },
          virtual: true,
        },
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

  // Bot settings moved to /admin/bots (engine-based)
  globals: [],

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
