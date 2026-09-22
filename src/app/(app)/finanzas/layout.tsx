import { FinanceNav } from "@/features/finance/components/FinanceNav";
import { FinanceModals } from "@/features/finance/components/FinanceModals";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <FinanceNav />
      {children}
      <FinanceModals />
    </div>
  );
}
