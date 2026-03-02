import { MarketAnalytics } from "@/lib/analytics/market";

export default function MarketBadge({ status }: { status: MarketAnalytics["status"] }) {
    if (status === "under_msrp") return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Excellent Deal</span>;
    if (status === "fair") return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">Fair Price</span>;
    if (status === "overpriced") return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-500/20 text-amber-500 border border-amber-500/30">Overpriced</span>;
    if (status === "extreme") return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">Extremely Overpriced</span>;
    return <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">Unknown Data</span>;
}
