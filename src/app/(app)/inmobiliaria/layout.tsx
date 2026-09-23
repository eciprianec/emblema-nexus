import { RealEstateNav } from "@/features/real-estate/components/RealEstateNav";
import { RealEstateModals } from "@/features/real-estate/components/RealEstateModals";

export default function RealEstateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <RealEstateNav />
      {children}
      <RealEstateModals />
    </div>
  );
}
