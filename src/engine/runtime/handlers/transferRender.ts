export const buildPayloadLabel = (payload: Record<string, number>): string => {
    const entries = Object.entries(payload);
    if (entries.length === 0) return "Transfer";
    return entries.map(([key, amount]) => `${amount} ${key}`).join(", ");
};

export const resolveTransferVisualType = (
    payload: Record<string, number>,
): string | null => Object.keys(payload)[0] ?? null;

