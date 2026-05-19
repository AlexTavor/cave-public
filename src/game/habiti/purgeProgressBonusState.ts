export const purgeProgressMaxBonusStateKey = "habiti_purge_progress_max_bonus";

export const readPurgeProgressMaxBonus = (world: unknown): number => {
    const entry = (
        world as { state?: Record<string, { value?: unknown }> } | undefined
    )?.state?.[purgeProgressMaxBonusStateKey];
    return typeof entry?.value === "number" ? entry.value : 0;
};
