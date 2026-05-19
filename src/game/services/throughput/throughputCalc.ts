export const calcThroughputRate = (
    amount: number,
    efficiency: number,
    thresholdMs: number,
): number => {
    if (!Number.isFinite(amount) || !Number.isFinite(efficiency)) return 0;
    if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) return 0;
    if (amount <= 0 || efficiency <= 0) return 0;

    return (amount * efficiency * 1000) / thresholdMs;
};
