function getBaseUrl() {
  // Server-side: use NEXTAUTH_URL or localhost
  if (typeof window === "undefined") {
    return process.env.NEXTAUTH_URL || "http://localhost:3000";
  }
  // Client-side: relative URL
  return "";
}

export async function getGlobal<T = any>(slug: string): Promise<T | null> {
  try {
    const base = getBaseUrl();
    const res = await fetch(`${base}/api/payload/globals/${slug}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch (e) {
    console.error(`Failed to fetch global "${slug}":`, e);
    return null;
  }
}
