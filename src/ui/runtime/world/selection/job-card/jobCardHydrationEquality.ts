import type { SuspiciousActivityIndicatorModel } from "./resolveSuspiciousActivityIndicator";

export const suspiciousActivityEqual = (
    left?: SuspiciousActivityIndicatorModel | null,
    right?: SuspiciousActivityIndicatorModel | null,
) =>
    left?.text === right?.text &&
    left?.color === right?.color &&
    left?.tooltipTitle === right?.tooltipTitle &&
    JSON.stringify(left?.tooltipLines ?? []) ===
        JSON.stringify(right?.tooltipLines ?? []);
