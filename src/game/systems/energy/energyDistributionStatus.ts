import type { PowerStatus } from "./energyDistributionTypes";
import {
    BLACKOUT_THRESHOLD,
    NOMINAL_THRESHOLD,
} from "./energyDistributionTypes";

export const resolveStatus = (efficiency: number): PowerStatus => {
    if (efficiency >= NOMINAL_THRESHOLD) return "nominal";
    if (efficiency <= BLACKOUT_THRESHOLD) return "blackout";
    return "brownout";
};
