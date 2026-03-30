import type { CollectionConfig } from "payload";

export const Pages: CollectionConfig = {
  slug: "cms_pages",
  labels: {
    singular: "Страница",
    plural: "Страницы",
  },
  admin: {
    useAsTitle: "title",
  },
  fields: [
    {
      name: "title",
      type: "text",
      label: "Заголовок",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      label: "URL (slug)",
      required: true,
      unique: true,
      admin: {
        description: "Например: home, about, booking",
      },
    },
    {
      name: "blocks",
      type: "blocks",
      label: "Блоки страницы",
      blocks: [
        {
          slug: "hero",
          labels: { singular: "Герой-блок", plural: "Герой-блоки" },
          fields: [
            { name: "heading", type: "text", label: "Заголовок", required: true },
            { name: "subheading", type: "text", label: "Подзаголовок" },
            { name: "buttonText", type: "text", label: "Текст кнопки" },
            { name: "buttonLink", type: "text", label: "Ссылка кнопки" },
            { name: "backgroundImage", type: "upload", relationTo: "cms_media", label: "Фоновое изображение" },
          ],
        },
        {
          slug: "textBlock",
          labels: { singular: "Текстовый блок", plural: "Текстовые блоки" },
          fields: [
            { name: "heading", type: "text", label: "Заголовок" },
            { name: "content", type: "richText", label: "Содержимое", required: true },
          ],
        },
        {
          slug: "cardsSection",
          labels: { singular: "Секция карточек", plural: "Секции карточек" },
          fields: [
            { name: "heading", type: "text", label: "Заголовок секции" },
            { name: "subheading", type: "text", label: "Подзаголовок" },
            {
              name: "cards",
              type: "array",
              label: "Карточки",
              fields: [
                { name: "title", type: "text", label: "Заголовок", required: true },
                { name: "description", type: "textarea", label: "Описание" },
                { name: "image", type: "upload", relationTo: "cms_media", label: "Изображение" },
                { name: "link", type: "text", label: "Ссылка" },
              ],
            },
          ],
        },
        {
          slug: "banner",
          labels: { singular: "Баннер", plural: "Баннеры" },
          fields: [
            { name: "heading", type: "text", label: "Заголовок", required: true },
            { name: "text", type: "textarea", label: "Текст" },
            { name: "buttonText", type: "text", label: "Текст кнопки" },
            { name: "buttonLink", type: "text", label: "Ссылка кнопки" },
            { name: "image", type: "upload", relationTo: "cms_media", label: "Изображение" },
            {
              name: "style",
              type: "select",
              label: "Стиль",
              defaultValue: "dark",
              options: [
                { label: "Тёмный", value: "dark" },
                { label: "Светлый", value: "light" },
                { label: "Акцент", value: "accent" },
              ],
            },
          ],
        },
        {
          slug: "features",
          labels: { singular: "Преимущества", plural: "Преимущества" },
          fields: [
            { name: "heading", type: "text", label: "Заголовок секции" },
            {
              name: "items",
              type: "array",
              label: "Элементы",
              fields: [
                { name: "icon", type: "text", label: "Иконка (emoji или название)" },
                { name: "title", type: "text", label: "Заголовок", required: true },
                { name: "description", type: "textarea", label: "Описание" },
              ],
            },
          ],
        },
        {
          slug: "gallery",
          labels: { singular: "Галерея", plural: "Галереи" },
          fields: [
            { name: "heading", type: "text", label: "Заголовок" },
            {
              name: "images",
              type: "array",
              label: "Изображения",
              fields: [
                { name: "image", type: "upload", relationTo: "cms_media", label: "Изображение", required: true },
                { name: "caption", type: "text", label: "Подпись" },
              ],
            },
          ],
        },
        {
          slug: "contactInfo",
          labels: { singular: "Контакты", plural: "Контакты" },
          fields: [
            { name: "heading", type: "text", label: "Заголовок" },
            { name: "address", type: "text", label: "Адрес" },
            { name: "phone", type: "text", label: "Телефон" },
            { name: "email", type: "text", label: "Email" },
            { name: "telegram", type: "text", label: "Telegram" },
            { name: "instagram", type: "text", label: "Instagram" },
            { name: "workingHours", type: "text", label: "Часы работы" },
          ],
        },
      ],
    },
  ],
};
