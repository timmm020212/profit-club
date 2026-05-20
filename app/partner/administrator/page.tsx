import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminsClient from "./AdminsClient";

export const dynamic = "force-dynamic";

export default async function AdministratorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "partner" || !session.user.salonId) {
    redirect("/partner/join");
  }
  return <AdminsClient />;
}
