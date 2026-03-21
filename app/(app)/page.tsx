import ServiceGrid from "@/components/ServiceGrid";
import DarkMarquee from "@/components/DarkMarquee";
import PhilosophySection from "@/components/PhilosophySection";
import ZonesShowcase from "@/components/ZonesShowcase";
import ProcessSteps from "@/components/ProcessSteps";
import MastersSection from "@/components/MastersSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FooterSection from "@/components/FooterSection";
import HeroParallax from "@/components/HeroParallax";

export default async function Home() {
  return (
    <main className="min-h-screen relative z-10 bg-[#06060A]" suppressHydrationWarning>
      <HeroParallax />
      <DarkMarquee />
      <ServiceGrid />
      <PhilosophySection />
      <ZonesShowcase />
      <ProcessSteps />
      <MastersSection />
      <TestimonialsSection />
      <FooterSection />
    </main>
  );
}
