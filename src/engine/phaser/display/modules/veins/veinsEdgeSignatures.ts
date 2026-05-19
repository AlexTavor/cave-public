import type { VeinsDisplayEdge } from "../../VeinsDisplayData";

export const buildStableGeometrySignature = (edge: VeinsDisplayEdge): string =>
    JSON.stringify([
        edge.veinType,
        edge.ax,
        edge.ay,
        edge.bx,
        edge.by,
        edge.meanderPoints,
        edge.pathLengthPx,
        edge.segments,
        edge.ampPx,
        edge.freq,
        edge.phase0,
        edge.seed,
        edge.wavinessSimplexScale,
    ]);

export const buildRopeStyleSignature = (edge: VeinsDisplayEdge): string =>
    JSON.stringify([
        edge.widthPx,
        edge.glowWidthEndPx,
        edge.baseColor,
        edge.glowAlpha,
    ]);
