import { DEFAULT_CAVE_FUR_RENDER } from "../../../../../data/schemas/game/caveMindRender";
import { makeDisplayScratch } from "../displayScratchTestUtils";

export const makeFakeGraphics = () => ({
    clearCalls: 0,
    fillCalls: 0,
    strokeCalls: 0,
    visible: false,
    clear() {
        this.clearCalls += 1;
    },
    fillStyle() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fillPath() {
        this.fillCalls += 1;
    },
    strokePath() {
        this.strokeCalls += 1;
    },
    setVisible(value: boolean) {
        this.visible = value;
    },
});

export const makeCaveCtx = (entityOverrides: Record<string, unknown> = {}) => {
    const acquired: ReturnType<typeof makeFakeGraphics>[] = [];
    const released: ReturnType<typeof makeFakeGraphics>[] = [];
    const backgroundAnchor = { add() {}, remove() {} };
    const pools = {
        get: () => ({
            graphicsPool: {
                acquire: () => {
                    const graphics = makeFakeGraphics();
                    acquired.push(graphics);
                    return graphics;
                },
                release: (graphics: ReturnType<typeof makeFakeGraphics>) =>
                    released.push(graphics),
            },
        }),
    };
    const ctx = {
        scene: {},
        layers: {},
        pools,
        textureManager: {},
        pulseEngine: {},
        spec: {
            entityId: "cave",
            display_key: "cave_level",
            label: "",
            styleId: null,
            hasPhysics: true,
            x: 0,
            y: 0,
            radius: 40,
        },
        scratch: makeDisplayScratch({
            root: {},
            backgroundAnchor,
            effectsAnchor: {},
            overlayAnchor: {},
        }),
        entity: {
            cave: { mind: { render: { fur: DEFAULT_CAVE_FUR_RENDER } } },
            ...entityOverrides,
        },
        selectedEntityId: null,
        selectEntity() {},
        timeMs: 1000,
        deltaMs: 16,
        pulseValue: 0.5,
    };
    return { acquired, released, ctx };
};
