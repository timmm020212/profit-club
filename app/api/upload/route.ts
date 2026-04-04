import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json({ error: "Допустимы только изображения (jpg, png, webp)" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Допустимы только изображения" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Файл слишком большой (макс. 10 МБ)" }, { status: 400 });
    }
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const savePath = path.join(process.cwd(), "public", "uploads", "services", filename);

    await writeFile(savePath, buffer);
    return NextResponse.json({ url: `/uploads/services/${filename}` });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Ошибка загрузки файла" }, { status: 500 });
  }
}
