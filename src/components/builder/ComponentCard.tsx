import { type LucideIcon, Plus, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BaseProduct } from "@/lib/products/types";
import { formatINR } from "@/lib/utils/formatCurrency";

interface ComponentCardProps {
    category: string;
    title: string;
    icon: LucideIcon;
    description: string;
    selectedItem?: BaseProduct | null;
    onSelect: () => void;
    onRemove: () => void;
}

export function ComponentCard({
    category,
    title,
    icon: Icon,
    description,
    selectedItem,
    onSelect,
    onRemove
}: ComponentCardProps) {
    return (
        <Card className={`relative group transition-all duration-300 ${selectedItem
            ? "border-primary/50 bg-primary/5 shadow-sm"
            : "border-dashed hover:border-primary/50 hover:bg-black/20"
            }`}>
            <div className="p-4 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${selectedItem ? "bg-primary/20 text-primary" : "bg-neutral-800 text-neutral-400 group-hover:text-primary transition-colors"}`}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">{title}</span>
                    </div>
                    {selectedItem && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            className="text-neutral-500 hover:text-red-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Content */}
                {!selectedItem ? (
                    <div
                        onClick={onSelect}
                        className="flex-1 flex flex-col items-center justify-center py-6 cursor-pointer space-y-2"
                    >
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                            <Plus className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-neutral-500 font-medium tracking-tight">Select {title}</p>
                    </div>
                ) : (
                    <div className="flex-1 space-y-2">
                        <h4 className="text-sm font-bold text-neutral-100 leading-tight line-clamp-2">
                            {selectedItem.name}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">{selectedItem.brand}</span>
                            {/* Common specs */}
                            {selectedItem.category === 'cpu' && (
                                <span className="text-[10px] text-neutral-400">{(selectedItem as any).socket}</span>
                            )}
                            {selectedItem.category === 'ram' && (
                                <span className="text-[10px] text-neutral-400">{(selectedItem as any).speedMHz}MHz</span>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                            <span className="text-sm font-bold text-neutral-100">
                                {selectedItem.pricing?.priceRange?.min ? formatINR(selectedItem.pricing.priceRange.min) : "₹--"}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-bold gap-1.5 hover:text-primary"
                                onClick={onSelect}
                            >
                                <RefreshCw className="w-3 h-3" /> Replace
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
