import { NextResponse } from "next/server";
import { uploadAsset, validateImage } from "@/lib/uploadAsset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    const check = validateImage(file, 10 * 1024 * 1024);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    const url = await uploadAsset({ folder: "services", file });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error uploading service image:", error);
    return NextResponse.json({ error: "Не удалось загрузить файл" }, { status: 500 });
  }
}
