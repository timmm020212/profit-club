import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

export interface PartnerSessionData {
  partnerUserId: string;
  salonId: number;
  salonSlug: string;
  salonName: string;
}

export async function requirePartnerSession(): Promise<
  { session: PartnerSessionData; response: null } |
  { session: null; response: NextResponse }
> {
  const nextAuthSession = await getServerSession(authOptions);

  if (
    !nextAuthSession?.user ||
    nextAuthSession.user.role !== "partner" ||
    !nextAuthSession.user.salonId
  ) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    session: {
      partnerUserId: nextAuthSession.user.id,
      salonId: nextAuthSession.user.salonId,
      salonSlug: nextAuthSession.user.salonSlug || "",
      salonName: nextAuthSession.user.salonName || nextAuthSession.user.name,
    },
    response: null,
  };
}
