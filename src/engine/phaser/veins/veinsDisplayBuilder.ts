import type { VeinEdge, VeinGraph, VeinNode } from "./types";
import type { VeinsDisplayEdge } from "../display/VeinsDisplayData";
import {
    resolveBaseWidth,
    resolveSegmentCount,
    resolveThrottleWidth,
    resolveWaveCycles,
} from "./veinGeometry";
import type { VeinConfig } from "../../../data/schemas/assets";
import { resolveDisplayColors } from "./veinDisplayColors";
import { buildVeinPathShape } from "./veinPathShape";
import {
    buildEdgeId,
    hashSeed,
    resolveTaperMultiplier,
} from "./veinsEdgeMetrics";

const resolveNervousWidth = (edge: VeinEdge, config: VeinConfig): number =>
    Math.max(
        config.thickness.min_width,
        resolveThrottleWidth(edge.comfort01 ?? 1, config),
    );

const lookupNode = (nodes: Map<string, VeinNode>, id: string) => nodes.get(id);

export const buildDisplayEdges = (
    graph: VeinGraph,
    config: VeinConfig,
): VeinsDisplayEdge[] => {
    const result: VeinsDisplayEdge[] = [];
    const edgeIdCounts = new Map<string, number>();
    for (const edge of graph.edges) {
        const src = lookupNode(graph.nodes, edge.sourceId);
        const tgt = lookupNode(graph.nodes, edge.targetId);
        if (!src || !tgt) continue;
        let widthPx = resolveBaseWidth(edge.power, config);
        if (edge.kind === "resource-demand") {
            widthPx = resolveThrottleWidth(edge.throttle01, config);
        } else if (edge.kind === "nervous") {
            widthPx = resolveNervousWidth(edge, config);
        }
        if (widthPx < 0.1) continue;
        const baseId = buildEdgeId(edge);
        const duplicateIndex = edgeIdCounts.get(baseId) ?? 0;
        edgeIdCounts.set(baseId, duplicateIndex + 1);
        const id =
            duplicateIndex === 0 ? baseId : `${baseId}#${duplicateIndex}`;
        const seed = hashSeed(baseId);
        const { meanderPoints, pathLengthPx } = buildVeinPathShape({
            ax: src.x,
            ay: src.y,
            bx: tgt.x,
            by: tgt.y,
            edgeId: baseId,
            edgeSeed: seed,
            meander: config.geometry.meander,
        });
        const colors = resolveDisplayColors(
            baseId,
            edge.attribute,
            edge.intensity,
            config,
        );
        const blobSpawnRateHz =
            edge.deliveredRate / config.flow.energy_per_blob;
        const endWidthPx = widthPx;
        const startWidthPx = widthPx * resolveTaperMultiplier(baseId, config);
        result.push({
            id,
            veinType: edge.attribute,
            sourceKey: edge.sourceId,
            aId: edge.sourceId,
            bId: edge.targetId,
            ax: src.x,
            ay: src.y,
            ar: src.radius,
            bx: tgt.x,
            by: tgt.y,
            br: tgt.radius,
            widthPx,
            startWidthPx,
            endWidthPx,
            intensity01: edge.intensity,
            baseColor: colors.baseColor,
            pulseColor: colors.pulseColor,
            glowAlpha: 0.85,
            glowWidthStartPx:
                startWidthPx * config.thickness.glow_width_multiplier,
            glowWidthEndPx: endWidthPx * config.thickness.glow_width_multiplier,
            blobSpawnRateHz,
            blobSpeedPxPerSec: Math.max(
                config.flow.base_blob_speed_px_per_sec,
                blobSpawnRateHz * config.flow.min_blob_spacing_px,
            ),
            minBlobSpacingPx: config.flow.min_blob_spacing_px,
            blobSizeVariance01: config.flow.blob_size_variance,
            blobSpacingVariance01: config.flow.blob_spacing_variance,
            blobSaturationVariance01:
                config.heartbeats.blob_saturation_variance,
            meanderPoints,
            pathLengthPx,
            segments: resolveSegmentCount(pathLengthPx, config),
            ampPx: 2 + (seed % 3),
            freq: resolveWaveCycles(pathLengthPx, config),
            phase0: (seed % 628) / 100,
            seed,
            wavinessSimplexScale: config.geometry.waviness_simplex_scale,
        });
    }
    return result;
};

