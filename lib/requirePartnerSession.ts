import { NextResponse } from 'next/server';
import { getPartnerSession, PartnerSession } from './partner-auth';

export async function requirePartnerSession(): Promise<
  { session: PartnerSession; response: null } | { session: null; response: NextResponse }
> {
  const session = await getPartnerSession();
  if (!session) {
    return { session: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session, response: null };
}
