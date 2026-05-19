import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db, dbRetry } from "@/db/index-postgres";
import { salons } from "@/db/schema";
import { eq } from "drizzle-orm";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "partner" || !session.user.salonId) {
    redirect("/partner/join");
  }

  const initialSalon = await dbRetry(async () => {
    const [row] = await db.select({
      id: salons.id,
      slug: salons.slug,
      name: salons.name,
      city: salons.city,
      address: salons.address,
      phone: salons.phone,
      description: salons.description,
      logoUrl: salons.logoUrl,
    }).from(salons).where(eq(salons.id, session.user.salonId!));
    return row || null;
  }).catch(() => null);

  return <DashboardClient initialSalon={initialSalon} />;
}
