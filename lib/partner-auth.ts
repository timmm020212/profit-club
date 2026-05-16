import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SECRET = new TextEncoder().encode(
  process.env.PARTNER_JWT_SECRET || 'partner-dev-secret-change-in-prod'
);
const COOKIE = 'partner-token';
const EXPIRE = '30d';

export interface PartnerSession {
  salonId: number;
  salonSlug: string;
  salonName: string;
  partnerUserId: number;
  email: string;
}

export async function signPartnerToken(payload: PartnerSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(EXPIRE)
    .sign(SECRET);
}

export async function verifyPartnerToken(token: string): Promise<PartnerSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as PartnerSession;
  } catch {
    return null;
  }
}

export async function getPartnerSession(): Promise<PartnerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  return verifyPartnerToken(token);
}

export async function getPartnerSessionFromRequest(req: NextRequest): Promise<PartnerSession | null> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  return verifyPartnerToken(token);
}

export const PARTNER_COOKIE = COOKIE;
