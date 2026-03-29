import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterPortfolio } from "@/db/schema";
import { uploadFile } from "@/lib/supabase-storage";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const masterId = parseInt(formData.get("masterId") as string || "0");
    const description = (formData.get("description") as string) || "";
    const serviceId = parseInt(formData.get("serviceId") as string || "0") || null;

    if (!file || !masterId) {
      return NextResponse.json({ error: "file and masterId required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${masterId}/${Date.now()}.${ext}`;

    const url = await uploadFile("portfolio", path, buffer, file.type);
    if (!url) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const [inserted] = await db.insert(masterPortfolio).values({
      masterId,
      imageUrl: url,
      description: description || null,
      serviceId,
      createdAt,
    }).returning();

    return NextResponse.json({ photo: inserted });
  } catch (error) {
    console.error("Portfolio upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
