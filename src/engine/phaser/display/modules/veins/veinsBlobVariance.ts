import type { VeinsDisplayEdge } from "../../VeinsDisplayData";
import { scaleSaturationInt } from "../../../veins/colorUtils";

const hash = (value: string): number => {
    let result = 0;
    for (const ch of value) result = Math.imul(result, 31) + ch.charCodeAt(0);
    return Math.abs(result);
};

const centered = (edgeId: string, ordinal: number, key: string) =>
    ((hash(`${edgeId}:${ordinal}:${key}`) % 1000) / 999) * 2 - 1;

export const resolveBlobVariance = (
    edge: VeinsDisplayEdge,
    ordinal: number,
) => {
    const sizeMultiplier =
        1 + centered(edge.id, ordinal, "size") * edge.blobSizeVariance01;
    const spacingMultiplier =
        1 + centered(edge.id, ordinal, "spacing") * edge.blobSpacingVariance01;
    const saturationMultiplier =
        1 +
        centered(edge.id, ordinal, "saturation") *
            edge.blobSaturationVariance01;
    return {
        sizeMultiplier,
        spacingMultiplier,
        saturationMultiplier,
        tint: scaleSaturationInt(edge.pulseColor, saturationMultiplier),
    };
};
