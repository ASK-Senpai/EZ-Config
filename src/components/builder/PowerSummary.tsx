import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EnginePower {
    totalTDP: number;
    recommendedPSU: number;
    providedWattage: number;
}

export function PowerSummary({ power }: { power: EnginePower }) {
    const estimatedDraw = power.totalTDP;
    const recommendedMinimum = power.recommendedPSU;
    const selectedPsuWattage = power.providedWattage;

    let statusColor = "text-green-500";
    let bgColor = "bg-green-500/10";
    let borderColor = "border-green-500/20";
    let label = "Safe";

    if (selectedPsuWattage > 0) {
        if (selectedPsuWattage < estimatedDraw) {
            statusColor = "text-red-500";
            bgColor = "bg-red-500/10";
            borderColor = "border-red-500/20";
            label = "Insufficient Power";
        } else if (selectedPsuWattage < recommendedMinimum) {
            statusColor = "text-yellow-500";
            bgColor = "bg-yellow-500/10";
            borderColor = "border-yellow-500/20";
            label = "Recommended PSU higher";
        }
    } else if (estimatedDraw > 0) {
        statusColor = "text-neutral-500";
        bgColor = "bg-neutral-800";
        borderColor = "border-white/5";
        label = "Awaiting PSU Selection";
    }

    return (
        <Card className="bg-neutral-900/50 border-neutral-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> Power Estimation
                </CardTitle>
                {estimatedDraw > 0 && (
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusColor} ${bgColor} border ${borderColor}`}>
                        {label}
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">Estimated System Draw</span>
                    <span className="font-bold text-neutral-100">{estimatedDraw}W</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">Recommended Minimum</span>
                    <span className="font-bold text-neutral-100">{recommendedMinimum}W</span>
                </div>
                <div className="pt-3 border-t border-white/5 flex justify-between items-center text-sm font-bold">
                    <span className="text-neutral-400">Selected PSU Wattage</span>
                    <span className={selectedPsuWattage > 0 ? "text-primary" : "text-neutral-600"}>
                        {selectedPsuWattage ? `${selectedPsuWattage}W` : "Not Selected"}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
