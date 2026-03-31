import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";

import { Hero } from "./globals/Hero";
import { Marquee } from "./globals/Marquee";
import { ServicesSection } from "./globals/ServicesSection";
import { Philosophy } from "./globals/Philosophy";
import { Zones } from "./globals/Zones";
import { Process } from "./globals/Process";
import { MastersSection } from "./globals/MastersSection";
import { Testimonials } from "./globals/Testimonials";
import { Footer } from "./globals/Footer";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: " — Profit Club CMS",
    },
  },
  routes: {
    admin: "/cms",
    api: "/api/payload",
  },
  collections: [Users, Media, Pages],
  globals: [Hero, Marquee, ServicesSection, Philosophy, Zones, Process, MastersSection, Testimonials, Footer],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "profit-club-payload-secret-2026",
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
    push: false,
    schemaName: "cms",
  }),
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  sharp,
});
