import { requireAuth } from "@/server/auth/requireAuth";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    try {
        await requireAuth();
        return <>{children}</>;
    } catch (error) {
        redirect("/login");
    }
}
