import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Product Intelligence | EZ-Config",
    description: "Hardware Discovery & Market Analytics Platform.",
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center">
            {children}
        </div>
    );
}
