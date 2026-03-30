import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "cms_media",
  labels: {
    singular: "Медиа",
    plural: "Медиа",
  },
  upload: {
    staticDir: "public/media",
    mimeTypes: ["image/*", "video/*"],
  },
  admin: {
    useAsTitle: "alt",
  },
  fields: [
    {
      name: "alt",
      type: "text",
      label: "Описание (alt)",
      required: true,
    },
  ],
};
