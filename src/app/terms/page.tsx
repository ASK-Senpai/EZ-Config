import { motion } from "framer-motion";
import { SectionContainer } from "@/components/ui/SectionContainer";

export default function TermsAndConditions() {
    return (
        <section className="bg-background min-h-screen py-24 md:py-32">
            <SectionContainer className="max-w-4xl mx-auto space-y-12">
                <div className="space-y-4 border-b border-white/10 pb-8">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Terms and Conditions</h1>
                    <p className="text-muted-foreground text-lg">Last updated: February 2026</p>
                </div>

                <div className="space-y-12 text-muted-foreground/90 leading-relaxed text-base md:text-lg">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using the EZConfig platform ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree to all the terms and conditions of this agreement, then you may not access the website or use any services.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">2. Description of Service</h2>
                        <p>
                            EZConfig provides a structural platform to build, validate, and optimize PC configurations. We offer both free and premium services, utilizing standard rules, benchmarks, and artificial intelligence to assist users in selecting compatible computer hardware.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">3. User Responsibilities</h2>
                        <p>
                            You are responsible for maintaining the security of your account and password. You agree to use the Service only for lawful purposes. You must not transmit any worms, viruses, or any code of a destructive nature. While we strive for accuracy, the final responsibility for hardware purchases based on our analysis lies with the user.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">4. Premium Services</h2>
                        <p>
                            Some features of the Service are offered on a premium, paid basis ("Premium Services"). By subscribing to Premium Services, you gain access to deeper AI insights, advanced bottleneck calculations, and future-proof scoring, as detailed on our upgrade page.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">5. Payment Terms</h2>
                        <p>
                            Payments for Premium Services are securely processed via Razorpay. You agree to provide current, complete, and accurate purchase and account information. We reserve the right to refuse or cancel your order if fraud or an unauthorized or illegal transaction is suspected.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">6. Limitation of Liability</h2>
                        <p>
                            In no event shall EZConfig, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; or (ii) any conduct or content of any third party on the Service.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">7. Modifications</h2>
                        <p>
                            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">8. Termination</h2>
                        <p>
                            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
                        </p>
                    </div>

                    <div className="space-y-4 border-t border-white/10 pt-8">
                        <h2 className="text-2xl font-semibold text-foreground">9. Governing Law (India)</h2>
                        <p>
                            These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
                        </p>
                    </div>
                </div>
            </SectionContainer>
        </section>
    );
}
