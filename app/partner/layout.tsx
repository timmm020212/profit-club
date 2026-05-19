import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, dbRetry } from "@/db/index-postgres";
import { salons } from "@/db/schema";
import { eq } from "drizzle-orm";
import PartnerShell from "@/components/partner/PartnerShell";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  // Not logged in or not a partner → render bare (login/join pages)
  if (!session?.user || session.user.role !== "partner") {
    return <>{children}</>;
  }

  const salonId = session.user.salonId!;
  const salon = await dbRetry(async () => {
    const [row] = await db
      .select({ name: salons.name, tariff: salons.tariff })
      .from(salons)
      .where(eq(salons.id, salonId));
    return row;
  }).catch(() => null);

  return (
    <PartnerShell
      salonName={salon?.name || session.user.salonName || "Кабинет"}
      tariff={salon?.tariff || "basic"}
    >
      {children}
    </PartnerShell>
  );
}
