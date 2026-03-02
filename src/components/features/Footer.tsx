import { Cpu } from "lucide-react";
import Link from "next/link";
import { SectionContainer } from "@/components/ui/SectionContainer";

export default function Footer() {
    return (
        <footer className="border-t border-white/5 bg-background/50 backdrop-blur-sm py-12">
            <SectionContainer>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center space-x-2">
                        <Cpu className="h-5 w-5 text-muted-foreground" />
                        <span className="text-lg font-semibold text-muted-foreground">EZConfig</span>
                    </div>

                    <div className="flex flex-wrap justify-center items-start gap-12 md:gap-24 text-sm text-muted-foreground mr-0 md:mr-12">
                        <div className="flex flex-col gap-3">
                            <span className="font-semibold text-foreground uppercase tracking-wider text-xs mb-1">Product</span>
                            <Link href="/builder" className="hover:text-primary transition-colors">Builder</Link>
                            <Link href="/insights/gpu-market" className="hover:text-primary transition-colors">Insights</Link>
                            <Link href="/upgrade" className="hover:text-primary transition-colors">Pricing</Link>
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="font-semibold text-foreground uppercase tracking-wider text-xs mb-1">Company</span>
                            <Link href="/about" className="hover:text-primary transition-colors">About Us</Link>
                            <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
                            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground text-center md:text-right">
                        © 2026 EZConfig Inc. Built with Next.js & Tailwind.
                    </p>
                </div>
            </SectionContainer>
        </footer>
    );
}
