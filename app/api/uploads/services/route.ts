import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    const mime = file.type || "";
    if (!mime.startsWith("image/")) {
      return NextResponse.json({ error: "Можно загружать только изображения" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const original = file.name || "image";
    const ext = path.extname(original).toLowerCase() || ".jpg";

    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
    const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "services");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const url = `/uploads/services/${filename}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error uploading service image:", error);
    return NextResponse.json({ error: "Не удалось загрузить файл" }, { status: 500 });
  }
}
