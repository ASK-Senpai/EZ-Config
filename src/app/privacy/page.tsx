import { motion } from "framer-motion";
import { SectionContainer } from "@/components/ui/SectionContainer";

export default function PrivacyPolicy() {
    return (
        <section className="bg-background min-h-screen py-24 md:py-32">
            <SectionContainer className="max-w-4xl mx-auto space-y-12">
                <div className="space-y-4 border-b border-white/10 pb-8">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Privacy Policy</h1>
                    <p className="text-muted-foreground text-lg">Last updated: February 2026</p>
                </div>

                <div className="space-y-12 text-muted-foreground/90 leading-relaxed text-base md:text-lg">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
                        <p>
                            We collect information that you provide directly to us, such as when you create an account, save a PC build configuration, or contact customer support. This may include your name, email address, and configuration preferences. We also automatically collect certain information about your device and how you interact with our platform.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">2. How We Use Data</h2>
                        <p>
                            We use the information we collect to provide, maintain, and improve our services. This includes validating your PC builds, offering performance insights, processing transactions, and communicating with you about updates, security alerts, and support messages.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">3. Data Storage</h2>
                        <p>
                            Your data is securely stored using industry-standard encryption protocols. We utilize Firebase and related cloud services to manage authentication and user data. We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">4. AI Processing Disclosure</h2>
                        <p>
                            EZConfig utilizes artificial intelligence (including models hosted by Groq and other third-party providers) to generate build insights and performance summaries. When you request an AI analysis, relevant hardware configuration data is sent to these models. We do not use your personal identifiable information (PII) to train these AI models.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">5. Payment Processing</h2>
                        <p>
                            For premium features, we use Razorpay as our payment processor. We do not directly store your credit card details or bank account information on our servers. Razorpay processes your payment information securely in accordance with their own stringent privacy and security standards.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">6. User Rights</h2>
                        <p>
                            You have the right to access, correct, or delete your personal information stored on our platform. You may also object to or restrict certain processing of your data. To exercise these rights to your account data, please contact our support team.
                        </p>
                    </div>

                    <div className="space-y-4 border-t border-white/10 pt-8">
                        <h2 className="text-2xl font-semibold text-foreground">7. Contact Information</h2>
                        <p>
                            If you have any questions about this Privacy Policy or our data practices, please contact us at:
                            <br />
                            <a href="mailto:asksenpai.dev@gmail.com" className="text-primary hover:underline mt-2 inline-block">asksenpai.dev@gmail.com</a>
                        </p>
                    </div>
                </div>
            </SectionContainer>
        </section>
    );
}
