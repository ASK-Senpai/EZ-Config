import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type Status = "valid" | "warning" | "error";

interface CompatibilityBadgeProps {
    status: Status;
    text?: string;
    showIcon?: boolean;
}

export function CompatibilityBadge({ status, text, showIcon = true }: CompatibilityBadgeProps) {
    const configs = {
        valid: {
            color: "bg-green-500/10 text-green-500 border-green-500/20",
            icon: CheckCircle2,
            label: text || "Compatible"
        },
        warning: {
            color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
            icon: AlertTriangle,
            label: text || "Warning"
        },
        error: {
            color: "bg-red-500/10 text-red-500 border-red-500/20",
            icon: XCircle,
            label: text || "Incompatible"
        }
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
            {showIcon && <Icon className="w-3 h-3" />}
            {config.label}
        </div>
    );
}
