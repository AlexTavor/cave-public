import type { VeinConfig } from "../../../data/schemas/assets";
import type { VeinEdge } from "./types";

export const hashSeed = (id: string): number => {
    let hash = 0;
    for (const ch of id) {
        hash = (hash << 5) - hash + (ch.codePointAt(0) ?? 0);
        hash = Math.trunc(hash);
    }
    return Math.abs(hash);
};

export const buildEdgeId = (edge: VeinEdge): string => {
    const [a, b] = [edge.sourceId, edge.targetId].sort((x, y) =>
        x.localeCompare(y),
    );
    return `${edge.attribute}:${a}:${b}`;
};

export const resolveTaperMultiplier = (
    edgeId: string,
    config: VeinConfig,
): number => {
    const unit = (hashSeed(`${edgeId}:taper`) % 1000) / 999;
    const { min, max } = {
        min: config.thickness.taper_start_width_multiplier_min,
        max: config.thickness.taper_start_width_multiplier_max,
    };
    return min + (max - min) * unit;
};
