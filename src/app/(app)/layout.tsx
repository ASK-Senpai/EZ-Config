import { getFirestore } from "firebase-admin/firestore";
import { requireAuth } from "@/server/auth/requireAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { userService } from "@/lib/services/userService";
import { aiService } from "@/lib/services/aiService";
import { billingService } from "@/lib/services/billingService";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { AppHeader } from "@/components/layout/AppHeader";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let user;
    try {
        user = await requireAuth();
    } catch (err) {
        // Clear the stale cookie so middleware doesn't bounce us back to /dashboard
        const cookieStore = await cookies();
        cookieStore.delete(SESSION_COOKIE_NAME);
        redirect("/login");
    }
    const userId = user.uid;


    const [userData, usage, subscription] = await Promise.all([
        userService.getUser(userId) as Promise<any>,
        aiService.getUsageStats(userId),
        billingService.getSubscriptionStatus(userId)
    ]);

    const isPremium = subscription?.plan === "premium" && subscription?.status === "active";

    return (
        <div className="flex min-h-screen w-full bg-background">
            <Sidebar
                isPremium={isPremium}
                usage={usage || undefined}
                role={userData?.role}
            />
            <div className="flex-1 flex flex-col min-w-0">
                <AppHeader />
                <main className="flex-1 overflow-x-hidden">
                    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}


