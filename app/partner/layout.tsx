import { getPartnerSession } from "@/lib/partner-auth";
import { db } from "@/db";
import { salons } from "@/db/schema";
import { eq } from "drizzle-orm";
import PartnerShell from "@/components/partner/PartnerShell";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const session = await getPartnerSession();

  // Public partner pages (login/join/tariff) — no shell needed
  if (!session) {
    return <>{children}</>;
  }

  const [salon] = await db.select().from(salons).where(eq(salons.id, session.salonId));

  return (
    <PartnerShell salonName={salon?.name || session.salonName} tariff={salon?.tariff || "basic"}>
      {children}
    </PartnerShell>
  );
}
