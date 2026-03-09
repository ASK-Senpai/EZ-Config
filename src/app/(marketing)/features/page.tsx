import { SectionContainer } from "@/components/ui/SectionContainer";
import CTA from "@/components/features/landing/CTA";
import { CheckCircle2, Cpu, Zap, Activity, BrainCircuit, Layout } from "lucide-react";

export const metadata = {
    title: "Features - EZConfig",
    description: "Discover the powerful tools making PC building smarter.",
};

const features = [
    {
        icon: CheckCircle2,
        title: "Real-Time Compatibility Checks",
        description: "Instant validation for socket types, RAM dimensions, forms factors, and more to ensure everything fits perfectly.",
    },
    {
        icon: Cpu,
        title: "CPU–GPU Bottleneck Analysis",
        description: "Prevent performance bottlenecks with our advanced pairing algorithms that evaluate hardware synergies.",
    },
    {
        icon: Zap,
        title: "Safe Power Recommendation",
        description: "Accurately calculate peak and sustained power draws and get robust PSU capacity recommendations.",
    },
    {
        icon: Activity,
        title: "Simplified Performance Score",
        description: "Understand your build's potential at a glance with a unified 0-100 performance metric based on real-world data.",
    },
    {
        icon: BrainCircuit,
        title: "AI Build Insights",
        description: "Receive qualitative, intelligent feedback on your parts selection straight from our fine-tuned AI.",
    },
    {
        icon: Layout,
        title: "Clean Responsive Interface",
        description: "A gorgeous, distraction-free environment that looks great and works flawlessly on desktop, tablet, and mobile.",
    },
];

export default function FeaturesPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Hero */}
            <section className="pt-24 pb-16 sm:pt-32 sm:pb-24 border-b border-white/5 relative overflow-hidden text-center bg-black/40">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[128px] pointer-events-none" />
                <SectionContainer className="relative z-10 space-y-6">
                    <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
                        Powerful Tools for Smarter PC Building
                    </h1>
                    <p className="text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto">
                        Explore the full suite of features designed to eliminate guesswork, prevent bottlenecks, and guarantee your next build is perfect.
                    </p>
                </SectionContainer>
            </section>

            {/* Feature Grid */}
            <section className="py-12 sm:py-16 md:py-24 border-b border-white/5 bg-background">
                <SectionContainer>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {features.map((feature, idx) => (
                            <div key={idx} className="p-6 sm:p-8 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors flex flex-col h-full group">
                                <div className="p-3 bg-primary/10 shrink-0 w-fit rounded-xl mb-6 text-primary group-hover:bg-primary/20 transition-colors">
                                    <feature.icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg lg:text-xl font-semibold mb-3">{feature.title}</h3>
                                <p className="text-sm lg:text-base text-muted-foreground flex-grow">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </SectionContainer>
            </section>

            {/* Deep Dive Sections */}
            <section className="py-12 sm:py-16 md:py-24 bg-black/20">
                <SectionContainer className="space-y-16 sm:space-y-24 lg:space-y-32">
                    {/* Section 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                        <div className="space-y-6 order-1 md:order-1">
                            <h2 className="text-xl lg:text-3xl font-bold tracking-tight">
                                Intelligent Compatibility Resolution
                            </h2>
                            <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                                Never buy an incompatible motherboard again. Our engine maps thousands of form factors, socket variations, and chipset specs in milliseconds. If there's a conflict, we won't just block you—we'll dynamically propose the closest alternative component to keep your build rolling.
                            </p>
                        </div>
                        <div className="order-2 md:order-2 h-64 sm:h-80 bg-gradient-to-br from-green-500/10 to-transparent rounded-2xl border border-white/10 p-6 flex items-center justify-center shadow-2xl relative overflow-hidden group">
                            {/* Decorative Elements */}
                            <CheckCircle2 className="w-16 h-16 text-green-400 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    </div>

                    {/* Section 2 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                        <div className="space-y-6 order-1 md:order-2">
                            <h2 className="text-xl lg:text-3xl font-bold tracking-tight">
                                Deep Hardware Profiling
                            </h2>
                            <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                                Real performance isn't just teraflops or clock speeds. We analyze cache sizes, memory throughput, and instruction per clock (IPC) behavior to accurately gauge how a specific CPU handles a high-end GPU workload, ensuring every dollar spent goes directly intended frames.
                            </p>
                        </div>
                        <div className="order-2 md:order-1 h-64 sm:h-80 bg-gradient-to-br from-blue-500/10 to-transparent rounded-2xl border border-white/10 p-6 flex items-center justify-center shadow-2xl relative overflow-hidden group">
                            <Cpu className="w-16 h-16 text-blue-400 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    </div>

                    {/* Section 3 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                        <div className="space-y-6 order-1 md:order-1">
                            <h2 className="text-xl lg:text-3xl font-bold tracking-tight">
                                Advanced Thermal & Power Specs
                            </h2>
                            <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                                We account for TDP transient spikes and cooler clearance logic. The system ensures you purchase an efficient 80+ rated unit that supports your specific connectors, keeping the system safe, cool, and perfectly powered.
                            </p>
                        </div>
                        <div className="order-2 md:order-2 h-64 sm:h-80 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-2xl border border-white/10 p-6 flex items-center justify-center shadow-2xl relative overflow-hidden group">
                            <Zap className="w-16 h-16 text-yellow-400 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    </div>
                </SectionContainer>
            </section>

            <CTA />
        </div>
    );
}
