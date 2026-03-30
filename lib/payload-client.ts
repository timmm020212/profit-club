import configPromise from "@payload-config";

export async function getGlobal<T = any>(slug: string): Promise<T | null> {
  try {
    const { getPayload } = await import("payload");
    const payload = await getPayload({ config: configPromise });
    const data = await payload.findGlobal({ slug });
    return data as T;
  } catch (e) {
    console.error(`Failed to fetch global "${slug}":`, e);
    return null;
  }
}
