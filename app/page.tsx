import ServiceGrid from "../components/ServiceGrid";
import ImageCarousel from "../components/ImageCarousel";
import CosmetologyBlock from "../components/CosmetologyBlock";
import FitnessBlock from "../components/FitnessBlock";
import HeroParallax from "../components/HeroParallax";
import AboutSalon from "../components/AboutSalon";
import BarBlock from "../components/BarBlock";

export default async function Home() {
  return (
    <main className="min-h-screen relative z-10 bg-[#F4F3F0]">
      <HeroParallax />
      <ImageCarousel />
      <ServiceGrid />
      <AboutSalon />
      <FitnessBlock />
      <CosmetologyBlock />
      <BarBlock />
    </main>
  );
}
