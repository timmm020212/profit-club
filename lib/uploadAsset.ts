import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { uploadFile } from "@/lib/supabase-storage";

export type AssetFolder = "masters" | "services" | "branches";

const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"] as const;

export interface UploadOptions {
  folder: AssetFolder;
  file: File;
  prefix?: string | number;
  maxSizeBytes?: number;
}

export interface UploadValidation {
  ok: boolean;
  error?: string;
}

export function validateImage(file: File, maxSizeBytes = 10 * 1024 * 1024): UploadValidation {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTS.includes(ext as (typeof ALLOWED_EXTS)[number])) {
    return { ok: false, error: "Допустимы только JPG, PNG, WEBP" };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Это не изображение" };
  }
  if (file.size > maxSizeBytes) {
    const mb = Math.round(maxSizeBytes / (1024 * 1024));
    return { ok: false, error: `Файл больше ${mb} МБ` };
  }
  return { ok: true };
}

/**
 * Stores an uploaded image in Supabase Storage (bucket "cms-media").
 * Dev fallback to public/uploads/<folder> only when SUPABASE_SERVICE_ROLE_KEY is absent —
 * production containers (DockHost) have ephemeral FS, so Supabase is the only durable path there.
 */
export async function uploadAsset({ folder, file, prefix }: UploadOptions): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ext === "jpeg" ? "jpg" : ext;
  const idPart = prefix !== undefined && prefix !== "" ? `${prefix}-` : "";
  const filename = `${idPart}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supaUrl = await uploadFile("cms-media", `${folder}/${filename}`, buffer, file.type);
  if (supaUrl) return supaUrl;

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}
