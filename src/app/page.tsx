import Hero from "@/components/features/landing/Hero";
import ProblemSection from "@/components/features/landing/ProblemSection";
import AdvantagesSection from "@/components/features/landing/AdvantagesSection";
import HowItWorksSection from "@/components/features/landing/HowItWorksSection";
import AIInsightSection from "@/components/features/landing/AIInsightSection";
import CTA from "@/components/features/landing/CTA";
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <ProblemSection />
      <AdvantagesSection />
      <HowItWorksSection />
      <AIInsightSection />
      <CTA />
    </div>
  );
}
