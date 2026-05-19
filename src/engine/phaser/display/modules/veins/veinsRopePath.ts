import { createSimplex2D } from "./veinsSimplexNoise";
import { buildPolylineMetrics } from "./veinsVisualMath";
import { sampleGuidePathPoint } from "./veinsGuidePathSampler";
import { buildSmoothGuidePath } from "../../../veins/veinSmoothGuidePath";
import type { CompiledVeinGuidePath, VeinPoint } from "./veinsModuleTypes";

type RopeEdge = {
    ax: number;
    ay: number;
    bx: number;
    by: number;
    meanderPoints?: Array<{ x: number; y: number }>;
    pathLengthPx?: number;
    segments?: number;
    ampPx: number;
    freq: number;
    phase0: number;
    seed: number;
    wavinessSimplexScale?: number;
};

const ZERO_LENGTH_PX = 0.001;

export const compileVeinGuidePath = (
    edge: RopeEdge,
): CompiledVeinGuidePath | null => {
    const guidePath = buildSmoothGuidePath([
        { x: edge.ax, y: edge.ay },
        ...(edge.meanderPoints ?? []),
        { x: edge.bx, y: edge.by },
    ]);
    const { segmentLensPx, totalLenPx: measuredLengthPx } =
        buildPolylineMetrics(guidePath);
    const pathLengthPx =
        edge.pathLengthPx && edge.pathLengthPx > 0
            ? edge.pathLengthPx
            : measuredLengthPx;
    if (pathLengthPx < ZERO_LENGTH_PX) return null;
    const segments =
        typeof edge.segments === "number" && edge.segments > 0
            ? Math.ceil(edge.segments)
            : 16;
    return {
        guidePath,
        segmentLensPx,
        pathLengthPx,
        distances: Array.from(
            { length: segments + 1 },
            (_, index) => (pathLengthPx / segments) * index,
        ),
        simplex: createSimplex2D(edge.seed),
    };
};

export const resolveVeinRopePoints = (
    compiled: CompiledVeinGuidePath,
    edge: RopeEdge,
    phaseShiftRad = 0,
): VeinPoint[] =>
    compiled.distances.map((distancePx, index) => {
        if (index === 0) return { x: edge.ax, y: edge.ay };
        if (index === compiled.distances.length - 1)
            return { x: edge.bx, y: edge.by };
        const { point, nx, ny } = sampleGuidePathPoint(
            compiled.guidePath,
            compiled.segmentLensPx,
            distancePx,
        );
        const distance01 = distancePx / compiled.pathLengthPx;
        if (edge.freq <= 0) return point;
        const envelope = Math.sin(Math.PI * distance01);
        const scale = edge.wavinessSimplexScale ?? 0;
        const ampNoise =
            scale === 0
                ? 0
                : compiled.simplex(distance01 * scale * 2.4 + 5.1, 7.9) * 0.35;
        const phaseNoise =
            scale === 0
                ? 0
                : compiled.simplex(
                      distance01 * scale * 1.7 + 9.3,
                      phaseShiftRad * 0.12 + 4.7,
                  );
        const wave =
            envelope *
            edge.ampPx *
            (1 + ampNoise) *
            Math.sin(
                2 * Math.PI * edge.freq * distance01 +
                    edge.phase0 +
                    phaseShiftRad +
                    phaseNoise * 0.7,
            );
        return { x: point.x + nx * wave, y: point.y + ny * wave };
    });

export const buildRopePointsFull = (
    edge: RopeEdge,
    phaseShiftRad = 0,
): VeinPoint[] => {
    const compiled = compileVeinGuidePath(edge);
    return compiled ? resolveVeinRopePoints(compiled, edge, phaseShiftRad) : [];
};
