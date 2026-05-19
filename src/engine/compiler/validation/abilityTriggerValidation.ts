type TriggeredEntry = { triggers?: string[] };

export const requiresCycleAbility = (
    entries: ReadonlyArray<TriggeredEntry> | undefined,
): boolean =>
    (entries ?? []).some((entry) =>
        (entry.triggers ?? ["cycle_complete"]).includes("cycle_complete"),
    );
