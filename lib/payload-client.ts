const PAYLOAD_API = process.env.NEXT_PUBLIC_PAYLOAD_API || "http://localhost:3000/api/payload";

export async function getGlobal<T = any>(slug: string): Promise<T | null> {
  try {
    const res = await fetch(`${PAYLOAD_API}/globals/${slug}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch (e) {
    console.error(`Failed to fetch global "${slug}":`, e);
    return null;
  }
}
