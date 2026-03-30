import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "cms_users",
  auth: true,
  admin: {
    useAsTitle: "email",
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
    },
  ],
};
