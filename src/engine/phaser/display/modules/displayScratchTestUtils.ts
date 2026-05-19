export const makeDisplayScratch = (
    overrides: Record<string, unknown> = {},
) => ({
    root: null,
    backgroundAnchor: null,
    effectsAnchor: null,
    overlayAnchor: null,
    backgroundImage: null,
    mainImage: null,
    particlesManager: null,
    cycleProgressRope: null,
    caveFillGraphics: null,
    caveHairGraphics: null,
    nodeOverlayDisplayBounds: null,
    ...overrides,
});
