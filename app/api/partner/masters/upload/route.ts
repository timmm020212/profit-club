import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { uploadAsset, validateImage } from "@/lib/uploadAsset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });

    const check = validateImage(file, 5 * 1024 * 1024);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    const url = await uploadAsset({ folder: "masters", file, prefix: session.salonId });
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Master upload error:", msg);
    return NextResponse.json({ error: "Ошибка загрузки", detail: msg }, { status: 500 });
  }
}
