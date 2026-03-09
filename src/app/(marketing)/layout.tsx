import Navbar from "@/components/features/Navbar";
import Footer from "@/components/features/Footer";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export default async function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE_NAME);
    const isLoggedIn = !!session?.value;

    return (
        <>
            <Navbar isLoggedIn={isLoggedIn} />
            <main className="flex-grow">{children}</main>
            <Footer />
        </>
    );
}
