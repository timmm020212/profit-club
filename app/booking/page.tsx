import Header from "@/components/Header";
import BookingServicesGrid from "@/components/BookingServicesGrid";

export default function BookingPage() {
  return (
    <main className="min-h-screen bg-white text-[#2A2A2A]">
      <Header />
      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4 max-w-6xl">
          <BookingServicesGrid />
        </div>
      </section>
    </main>
  );
}
