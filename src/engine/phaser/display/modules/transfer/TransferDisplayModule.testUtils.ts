import { BLEND_MODE_NORMAL } from "../../blendModes";
import { makeFakeImage, makeFakePool } from "../glyph/GlyphModule.testUtils";
import {
    addFakeLight,
    makeFakeEmitter,
    makeHolder,
    type FakeEmitter,
    type FakeLight,
} from "./transferDisplayTestFakes";

export const makeTransferCtx = (
    entity: Record<string, unknown>,
    hasPhysics = true,
) => {
    const pool = makeFakePool();
    const emitter = makeFakeEmitter();
    const addedLights: FakeLight[] = [];
    const removedLights: FakeLight[] = [];
    const root = makeHolder<ReturnType<typeof makeFakeImage>>();
    const backgroundAnchor = makeHolder<ReturnType<typeof makeFakeImage>>();
    const effectsAnchor = makeHolder<FakeEmitter>();
    const ctx = {
        scene: {
            add: {
                particles: (
                    _x: number,
                    _y: number,
                    _key: string,
                    config: Record<string, unknown>,
                ) => {
                    emitter.config = config;
                    return emitter;
                },
            },
            lights: {
                active: false,
                enable() {
                    this.active = true;
                    return this;
                },
                addLight(
                    x: number,
                    y: number,
                    radius: number,
                    color: number,
                    intensity: number,
                ) {
                    return addFakeLight(
                        addedLights,
                        x,
                        y,
                        radius,
                        color,
                        intensity,
                    );
                },
                removeLight(light: FakeLight) {
                    removedLights.push(light);
                },
            },
        },
        layers: {} as unknown,
        pools: { get: () => pool } as unknown,
        textureManager: {
            getShapeTexture: ({
                shape,
                color,
            }: {
                shape: string;
                color: string;
            }) => `${shape}:${color}`,
        } as unknown,
        pulseEngine: { getDemandPulse: () => 0.5 } as unknown,
        entity: entity as any,
        selectedEntityId: null,
        selectEntity: () => undefined,
        timeMs: 0,
        deltaMs: 16,
        pulseValue: 0.5,
        spec: {
            entityId: "e1",
            display_key: "transfer",
            label: "",
            styleId: null,
            hasPhysics,
            x: 0,
            y: 0,
            radius: 12,
        },
        scratch: {
            root,
            backgroundAnchor,
            effectsAnchor,
            overlayAnchor: makeHolder<unknown>(),
            backgroundImage: null,
            mainImage: null,
            particlesManager: null,
            cycleProgressRope: null,
        },
    };
    return {
        ctx,
        pool,
        emitter,
        root,
        backgroundAnchor,
        effectsAnchor,
        addedLights,
        removedLights,
        defaultBlend: BLEND_MODE_NORMAL,
    };
};
