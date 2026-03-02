import Link from "next/link"
import { RegisterForm } from "@/components/features/auth/RegisterForm"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { ChevronLeft } from "lucide-react"

export default function RegisterPage() {
    return (
        <SectionContainer className="relative flex flex-col items-center justify-center min-h-[100dvh] py-8 sm:py-12 px-4">
            <Link
                href="/"
                className="absolute top-6 sm:top-8 left-4 sm:left-8 flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
            </Link>

            <div className="w-full max-w-md mx-auto space-y-6">
                <div className="flex flex-col space-y-2 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Create an account
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Enter your email below to create your account
                    </p>
                </div>
                <RegisterForm />
                <p className="px-8 text-center text-sm text-muted-foreground">
                    <Link
                        href="/login"
                        className="hover:text-brand underline underline-offset-4"
                    >
                        Already have an account? Sign In
                    </Link>
                </p>
            </div>
        </SectionContainer>
    )
}
