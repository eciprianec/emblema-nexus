import { SurveyNav } from "@/features/survey/components/SurveyNav";
import { SurveyModals } from "@/features/survey/components/SurveyModals";

export default function SurveyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <SurveyNav />
      {children}
      <SurveyModals />
    </div>
  );
}
