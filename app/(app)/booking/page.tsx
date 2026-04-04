import Header from "@/components/Header";
import BookingServicesGrid from "@/components/BookingServicesGrid";

export default function BookingPage() {
  return (
    <main className="min-h-screen bg-[#09090D] text-white">
      <Header />
      <section className="pt-2 pb-10 md:pb-14">
        <div className="container mx-auto px-4 max-w-6xl">
          <BookingServicesGrid />
        </div>
      </section>
    </main>
  );
}
