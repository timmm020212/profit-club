import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nudnkpazetugfwykcxfw.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = "cms-media";

export const supabaseUploadHook = async ({ doc, req }: any) => {
  if (!doc?.filename || !SUPABASE_KEY) return doc;

  try {
    const filePath = path.resolve("public/media", doc.filename);
    if (!fs.existsSync(filePath)) return doc;

    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = doc.mimeType || "application/octet-stream";

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${doc.filename}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        "Content-Type": mimeType,
        "x-upsert": "true",
      },
      body: fileBuffer,
    });

    if (res.ok) {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${doc.filename}`;
      if (req?.payload) {
        await req.payload.update({
          collection: "cms_media",
          id: doc.id,
          data: { supabaseUrl: publicUrl },
          depth: 0,
        });
      }
      console.log(`[supabase-storage] Uploaded: ${doc.filename}`);
      return { ...doc, supabaseUrl: publicUrl };
    } else {
      console.error(`[supabase-storage] Upload failed:`, await res.text());
    }
  } catch (e) {
    console.error("[supabase-storage] Error:", e);
  }
  return doc;
};

export const supabaseDeleteHook = async ({ doc }: any) => {
  if (!doc?.filename || !SUPABASE_KEY) return doc;
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${doc.filename}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
    });
    console.log(`[supabase-storage] Deleted: ${doc.filename}`);
  } catch (e) {
    console.error("[supabase-storage] Delete error:", e);
  }
  return doc;
};
