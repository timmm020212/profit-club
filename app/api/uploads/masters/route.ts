import { NextResponse } from "next/server";
import { uploadAsset, validateImage } from "@/lib/uploadAsset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });

    const check = validateImage(file, 10 * 1024 * 1024);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    const url = await uploadAsset({ folder: "masters", file });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Ошибка загрузки файла" }, { status: 500 });
  }
}
