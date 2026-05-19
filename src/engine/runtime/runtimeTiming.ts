import { MAX_DT_MS } from "./runtimeConstants";

export const normalizeDt = (dt: number): number => {
    if (!Number.isFinite(dt) || dt <= 0) return 0;
    return Math.min(dt, MAX_DT_MS);
};
