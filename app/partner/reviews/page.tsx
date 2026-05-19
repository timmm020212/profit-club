import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db, dbRetry } from "@/db/index-postgres";
import { reviews, services, masters } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import ReviewsClient, { Review, ServiceLite, MasterLite } from "./ReviewsClient";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "partner" || !session.user.salonId) {
    redirect("/partner/join");
  }
  const salonId = session.user.salonId!;

  // reviews table may not exist yet (pre-migration). Catch + return [].
  const reviewsRows = await dbRetry(() => db
    .select()
    .from(reviews)
    .where(eq(reviews.salonId, salonId))
    .orderBy(desc(reviews.createdAt))
    .limit(500)
  ).catch(() => [] as Review[]);

  const [servicesRows, mastersRows] = await Promise.all([
    dbRetry(() => db
      .select({
        id: services.id, name: services.name, price: services.price, duration: services.duration,
      })
      .from(services)
      .where(eq(services.salonId, salonId))
      .orderBy(asc(services.orderDesktop))
    ).catch(() => [] as ServiceLite[]),
    dbRetry(() => db
      .select({
        id: masters.id, fullName: masters.fullName, specialization: masters.specialization, photoUrl: masters.photoUrl,
      })
      .from(masters)
      .where(and(eq(masters.salonId, salonId), eq(masters.isActive, true)))
      .orderBy(asc(masters.fullName))
    ).catch(() => [] as MasterLite[]),
  ]);

  return (
    <ReviewsClient
      initialReviews={reviewsRows as Review[]}
      services={servicesRows as ServiceLite[]}
      masters={mastersRows as MasterLite[]}
    />
  );
}
