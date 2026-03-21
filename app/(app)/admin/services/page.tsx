import { db } from "@/db";
import { masters } from "@/db/schema";
import AdminHeader from "@/components/AdminHeader";
import AdminSiteServicesManager from "@/components/AdminSiteServicesManager";

async function getMasters() {
  try {
    return await db.select().from(masters);
  } catch {
    return [];
  }
}

export default async function AdminServicesPage() {
  const mastersData = await getMasters();

  return (
    <div className="min-h-screen bg-[#070709] text-white">
      <AdminHeader masters={mastersData as any} />
      <AdminSiteServicesManager />
    </div>
  );
}
