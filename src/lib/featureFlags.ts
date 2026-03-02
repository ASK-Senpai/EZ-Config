export type FeatureFlag =
    | "AI_FULL_OVERVIEW"
    | "OPTIMIZE_BUILD"
    | "COMPARE_BUILDS"
    | "MARKET_TIMING"
    | "ADVANCED_FPS"
    | "EXPORT_BUILD";

export type Plan = "free" | "premium" | "admin";

const FLAG_CONFIG: Record<FeatureFlag, Plan[]> = {
    AI_FULL_OVERVIEW: ["premium", "admin"],
    OPTIMIZE_BUILD: ["premium", "admin"],
    COMPARE_BUILDS: ["premium", "admin"],
    MARKET_TIMING: ["premium", "admin"],
    ADVANCED_FPS: ["free", "premium", "admin"],
    EXPORT_BUILD: ["premium", "admin"],
};

export function isFeatureEnabled(feature: string, plan: string = "free"): boolean {
    const normalizedFeature = feature as FeatureFlag;
    const normalizedPlan = plan as Plan;
    return FLAG_CONFIG[normalizedFeature]?.includes(normalizedPlan) ?? false;
}

export function getEnabledFeatures(plan: string = "free"): FeatureFlag[] {
    const normalizedPlan = plan as Plan;
    return (Object.keys(FLAG_CONFIG) as FeatureFlag[]).filter((feature) =>
        FLAG_CONFIG[feature].includes(normalizedPlan)
    );
}
