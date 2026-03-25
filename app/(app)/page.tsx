import ServiceGrid from "@/components/ServiceGrid";
import DarkMarquee from "@/components/DarkMarquee";
import PhilosophySection from "@/components/PhilosophySection";
import ZonesShowcase from "@/components/ZonesShowcase";
import ProcessSteps from "@/components/ProcessSteps";
import MastersSection from "@/components/MastersSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FooterSection from "@/components/FooterSection";
import HeroParallax from "@/components/HeroParallax";
import { Pool } from "pg";

async function getLandingBlocks() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "",
      ssl: process.env.DATABASE_URL?.includes("supabase") ? { rejectUnauthorized: false } : undefined,
    });
    const { rows } = await pool.query(
      "SELECT block_type, title, subtitle, is_visible FROM landing_blocks WHERE is_visible = true ORDER BY \"order\" ASC"
    );
    await pool.end();
    const map: Record<string, { title?: string; subtitle?: string }> = {};
    for (const row of rows) {
      map[row.block_type] = { title: row.title || undefined, subtitle: row.subtitle || undefined };
    }
    return map;
  } catch {
    return {};
  }
}

export default async function Home() {
  const blocks = await getLandingBlocks();

  return (
    <main className="min-h-screen relative z-10 bg-[#06060A]" suppressHydrationWarning>
      {blocks.hero?.title !== undefined || !blocks.hero ? <HeroParallax cms={blocks.hero} /> : null}
      <DarkMarquee />
      <ServiceGrid cms={blocks.services} />
      <PhilosophySection cms={blocks.philosophy} />
      <ZonesShowcase cms={blocks.zones} />
      <ProcessSteps cms={blocks.process} />
      <MastersSection cms={blocks.masters} />
      <TestimonialsSection cms={blocks.testimonials} />
      <FooterSection cms={blocks.footer} />
    </main>
  );
}
