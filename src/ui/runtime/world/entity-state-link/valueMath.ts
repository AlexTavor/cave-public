export const computePercentage = (
    current: number | null,
    max: number | null | undefined,
    fallbackMax?: number,
): number => {
    const safeCurrent = Number.isFinite(current ?? Number.NaN)
        ? (current ?? 0)
        : 0;
    const resolvedMaxCandidate =
        Number.isFinite(max ?? Number.NaN) && max !== null && max !== undefined
            ? max
            : fallbackMax;
    const safeMax = Number.isFinite(resolvedMaxCandidate ?? Number.NaN)
        ? (resolvedMaxCandidate as number)
        : 0;

    if (safeMax <= 0) return 0;

    const percent = (safeCurrent / safeMax) * 100;
    if (!Number.isFinite(percent)) return 0;

    return Math.min(100, Math.max(0, percent));
};

export const formatProgressTransform = (progress: number): string => {
    return `scaleX(${computePercentage(progress, 100) / 100})`;
};

export const didVisualProgressChange = (
    currentTransform: string,
    currentProgress: string,
    nextTransform: string,
    nextProgress: number,
): boolean => {
    return (
        currentTransform !== nextTransform ||
        currentProgress !== String(nextProgress)
    );
};

