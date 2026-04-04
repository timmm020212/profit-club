import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "cms_users",
  auth: true,
  admin: {
    useAsTitle: "email",
  },
  access: {
    create: ({ req }) => req.user?.role === "admin",
    update: ({ req }) => req.user?.id === req.data?.id || req.user?.role === "admin",
    delete: ({ req }) => req.user?.role === "admin",
  },
  fields: [
    {
      name: "name",
      type: "text",
      label: "Имя",
    },
    {
      name: "role",
      type: "select",
      label: "Роль",
      defaultValue: "editor",
      options: [
        { label: "Администратор", value: "admin" },
        { label: "Редактор", value: "editor" },
      ],
      access: {
        update: ({ req }) => req.user?.role === "admin",
      },
    },
  ],
};
