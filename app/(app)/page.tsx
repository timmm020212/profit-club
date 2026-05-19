import { redirect } from "next/navigation";
import { db, dbRetry } from "@/db/index-postgres";
import { salons } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Берём первый активный салон и редиректим на его страницу.
  // В будущем здесь будет лендинг платформы для новых партнёров.
  const salon = await dbRetry(async () => {
    const [row] = await db
      .select({ slug: salons.slug })
      .from(salons)
      .where(eq(salons.isActive, true))
      .limit(1);
    return row;
  }).catch(() => null);

  if (salon?.slug) redirect(`/${salon.slug}`);
  redirect("/partner/join");
}
