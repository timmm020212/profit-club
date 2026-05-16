export const dynamic = "force-dynamic";

import ServiceGrid from "@/components/ServiceGrid";
import DarkMarquee from "@/components/DarkMarquee";
import PhilosophySection from "@/components/PhilosophySection";
import ZonesShowcase from "@/components/ZonesShowcase";
import ProcessSteps from "@/components/ProcessSteps";
import TestimonialsSection from "@/components/TestimonialsSection";
import FooterSection from "@/components/FooterSection";
import HeroParallax from "@/components/HeroParallax";
import { getGlobal } from "@/lib/payload-client";

export default async function Home() {
  const [hero, marquee, servicesSection, philosophy, zones, process, testimonials, footer] = await Promise.all([
    getGlobal("hero"),
    getGlobal("marquee"),
    getGlobal("services_section"),
    getGlobal("philosophy"),
    getGlobal("zones"),
    getGlobal("process"),
    getGlobal("testimonials"),
    getGlobal("footer"),
  ]);

  return (
    <main className="min-h-screen relative z-10 bg-[#06060A]" suppressHydrationWarning>
      <HeroParallax cms={hero} />
      <DarkMarquee cms={marquee} />
      <ServiceGrid cms={servicesSection} />
      <PhilosophySection cms={philosophy} />
      <ZonesShowcase cms={zones} />
      <ProcessSteps cms={process} />
<TestimonialsSection cms={testimonials} />
      <FooterSection cms={footer} />
    </main>
  );
}
