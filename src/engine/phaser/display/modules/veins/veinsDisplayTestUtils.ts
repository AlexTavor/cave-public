import { vi } from "vitest";
import { createPathCache } from "./veinsModuleTypes";
import type { PulseInstance, VeinEdgeVisualState } from "./veinsModuleTypes";
import type { VeinsDisplayEdge } from "../../VeinsDisplayData";

export const makeRope = () => ({
    setVisible: vi.fn(),
    setTexture: vi.fn(),
    setTintFill: vi.fn(),
    setColors: vi.fn(),
    setAlpha: vi.fn(),
    setScale: vi.fn(),
    setPosition: vi.fn(),
    setPoints: vi.fn(),
    setDirty: vi.fn(),
    updateVertices: vi.fn(),
});

export const makeImage = () => ({
    width: 10,
    setTexture: vi.fn(),
    setTint: vi.fn(),
    setAlpha: vi.fn(),
    setScale: vi.fn(),
    setDisplayOrigin: vi.fn(),
    setPosition: vi.fn(),
    setVisible: vi.fn(),
});

export const makePool = () => {
    const released: unknown[] = [];
    return {
        imagePool: {
            acquire: () => makeImage(),
            release: (item: unknown) => released.push(item),
        },
        released,
    };
};

export const makePulse = (distancePx = 0): PulseInstance => ({
    image: makeImage() as never,
    distancePx,
    ordinal: 0,
    tint: 2,
    scaleMultiplier: 1,
    revealInsetPx: 3,
});

export const redrawCount = (state: VeinEdgeVisualState): number =>
    [state.glowRope, state.baseRope].reduce(
        (total, rope) =>
            total +
            (rope.setPoints as ReturnType<typeof vi.fn>).mock.calls.length,
        0,
    );

export const makeState = (): VeinEdgeVisualState => ({
    container: {} as never,
    glowRope: makeRope() as never,
    baseRope: makeRope() as never,
    pulseContainer: { add: vi.fn(), remove: vi.fn() } as never,
    revealedLenPx: 0,
    lastIntensity01: 0,
    pulses: [],
    spawnCarry: 0,
    nextBlobOrdinal: 0,
    wavePhaseRad: 0,
    pathCache: createPathCache(),
});

export const makeEdge = (
    overrides: Partial<VeinsDisplayEdge> = {},
): VeinsDisplayEdge => ({
    id: "body:a:b",
    veinType: "body",
    sourceKey: "a",
    aId: "a",
    bId: "b",
    ax: 0,
    ay: 0,
    ar: 10,
    bx: 100,
    by: 0,
    br: 10,
    widthPx: 8,
    startWidthPx: 9,
    endWidthPx: 8,
    intensity01: 0,
    baseColor: 1,
    pulseColor: 2,
    glowAlpha: 0.5,
    glowWidthStartPx: 14,
    glowWidthEndPx: 13,
    blobSpawnRateHz: 2,
    blobSpeedPxPerSec: 20,
    minBlobSpacingPx: 10,
    blobSizeVariance01: 0,
    blobSpacingVariance01: 0,
    blobSaturationVariance01: 0,
    meanderPoints: [],
    pathLengthPx: 100,
    ampPx: 0,
    freq: 1,
    phase0: 0,
    seed: 1,
    wavinessSimplexScale: 0,
    ...overrides,
});
