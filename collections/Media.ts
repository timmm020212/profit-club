import type { CollectionConfig } from "payload";
import { supabaseUploadHook, supabaseDeleteHook } from "../lib/supabase-storage";

export const Media: CollectionConfig = {
  slug: "cms_media",
  labels: {
    singular: "Медиа",
    plural: "Медиа",
  },
  access: {
    read: () => true,
  },
  upload: {
    staticDir: "public/media",
    mimeTypes: ["image/*", "video/*"],
  },
  hooks: {
    afterChange: [supabaseUploadHook],
    afterDelete: [supabaseDeleteHook],
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
    {
      name: "supabaseUrl",
      type: "text",
      label: "URL в Supabase",
      admin: { readOnly: true, position: "sidebar" },
    },
  ],
};
