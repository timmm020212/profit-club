import BookingFlow from "@/components/BookingFlow";
import { db } from "@/db/index-sqlite";
import { services } from "@/db/schema-sqlite";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ serviceId: string }>;
}

export default async function BookingServicePage({ params }: Props) {
  const { serviceId } = await params;
  const serviceIdNum = parseInt(serviceId);

  if (isNaN(serviceIdNum)) notFound();

  const result = await db.select().from(services).where(eq(services.id, serviceIdNum));
  if (result.length === 0) notFound();

  const service = result[0];

  return <BookingFlow service={service as any} />;
}
