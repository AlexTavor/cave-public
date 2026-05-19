export const resolveToolbarStatus = (
    isProjectScope: boolean,
    isReady: boolean,
    isDirty: boolean,
) => {
    if (isProjectScope) {
        return { statusVariant: "clean" as const, statusLabel: "Up to Date" };
    }
    if (!isReady) {
        return { statusVariant: "loading" as const, statusLabel: "Loading" };
    }
    return isDirty
        ? { statusVariant: "dirty" as const, statusLabel: "Dirty" }
        : { statusVariant: "clean" as const, statusLabel: "Up to Date" };
};
