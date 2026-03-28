import MasterTabBar from "@/components/master/MasterTabBar";

export default function MasterFinancePage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="flex items-center justify-center pt-32 text-gray-400 text-sm">
        Финансы — скоро
      </div>
      <MasterTabBar />
    </div>
  );
}
