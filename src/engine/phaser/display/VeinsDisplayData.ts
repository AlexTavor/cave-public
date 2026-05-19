export type VeinType = string;

export type VeinsDisplayEdge = {
    id: string;
    veinType: VeinType;
    sourceKey: string;
    aId?: string;
    bId?: string;
    ax: number;
    ay: number;
    ar: number;
    bx: number;
    by: number;
    br: number;
    widthPx: number;
    startWidthPx: number;
    endWidthPx: number;
    intensity01: number;
    baseColor: number;
    pulseColor: number;
    glowAlpha: number;
    glowWidthStartPx: number;
    glowWidthEndPx: number;
    blobSpawnRateHz: number;
    blobSpeedPxPerSec: number;
    minBlobSpacingPx: number;
    blobSizeVariance01: number;
    blobSpacingVariance01: number;
    blobSaturationVariance01: number;
    meanderPoints: Array<{ x: number; y: number }>;
    pathLengthPx: number;
    segments?: number;
    ampPx: number;
    freq: number;
    phase0: number;
    seed: number;
    wavinessSimplexScale: number;
};

export type VeinsDisplayDataComponent = {
    edges: VeinsDisplayEdge[];
    isSimulationRunning: boolean;
};

