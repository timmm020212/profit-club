import { NextResponse } from "next/server";

export async function GET() {
  const SITE_URL = process.env.NEXTAUTH_URL || "";
  const clientToken = process.env.TELEGRAM_BOT_TOKEN;
  const mastersToken = process.env.MASTERS_BOT_TOKEN;

  const results: any = {};

  if (clientToken && SITE_URL.startsWith("https://")) {
    const r = await fetch(`https://api.telegram.org/bot${clientToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `${SITE_URL}/api/telegram/client` }),
    });
    results.client = await r.json();
  }

  if (mastersToken && SITE_URL.startsWith("https://")) {
    const r = await fetch(`https://api.telegram.org/bot${mastersToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `${SITE_URL}/api/telegram/masters` }),
    });
    results.masters = await r.json();
  }

  return NextResponse.json(results);
}
