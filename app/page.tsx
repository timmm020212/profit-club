import ServiceGrid from "../components/ServiceGrid";
import ImageCarousel from "../components/ImageCarousel";
import CosmetologyBlock from "../components/CosmetologyBlock";
import FitnessBlock from "../components/FitnessBlock";
import HeroParallax from "../components/HeroParallax";
import AboutSalon from "../components/AboutSalon";
import BarBlock from "../components/BarBlock";

export default async function Home() {
  return (
    <main className="min-h-screen relative z-10">
      {/* Изображение девушки - под шапкой с параллакс-эффектом */}
      <HeroParallax />
      
      {/* Карусель изображений */}
      <ImageCarousel />
      
      {/* Карточки услуг */}
      <ServiceGrid />
      
      {/* Блок "О салоне" */}
      <AboutSalon />
      
      {/* Белый разделитель между блоками */}
      <div className="relative w-full h-8 md:h-12 lg:h-16 bg-white z-10"></div>
      
      {/* Блок фитнеса с фоновым изображением */}
      <FitnessBlock />
      
      {/* Блок косметологии */}
      <CosmetologyBlock />
      
      {/* Блок бара */}
      <BarBlock />
      
      {/* Пустое белое пространство для тестирования скролла */}
      <div className="relative w-full h-[2000px] bg-white z-10"></div>
    </main>
  );
}
