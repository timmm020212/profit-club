import { getPayload } from "payload";
import config from "@payload-config";

let payloadInstance: Awaited<ReturnType<typeof getPayload>> | null = null;

async function getPayloadClient() {
  if (!payloadInstance) {
    payloadInstance = await getPayload({ config });
  }
  return payloadInstance;
}

export async function getGlobal<T = any>(slug: string): Promise<T | null> {
  try {
    const payload = await getPayloadClient();
    const data = await payload.findGlobal({ slug });
    return data as T;
  } catch (e) {
    console.error(`Failed to fetch global "${slug}":`, e);
    return null;
  }
}
