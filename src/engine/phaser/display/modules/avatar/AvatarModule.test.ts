import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../scenes/gameSceneMath", () => ({
    isRadiusVisible: () => true,
}));
vi.mock("../../avatar/AvatarSeedResolver", () => ({
    resolveAvatarSubjectSeed: vi.fn(() => "seed"),
}));
vi.mock("../../avatar/avatarBlink", () => ({ resolveBlinkScale: () => 1 }));
vi.mock("./avatarStackRender", () => ({
    hideAvatarImages: vi.fn((images) =>
        images.forEach((image: any) => image?.setVisible(false)),
    ),
    renderAvatarStack: vi.fn((_, images) => {
        images.glowImage.setVisible(true);
        images.silhouetteImage.setVisible(true);
        images.eyesImage.setVisible(true);
    }),
}));

import { resolveAvatarSubjectSeed } from "../../avatar/AvatarSeedResolver";
import { createAvatarModule } from "./AvatarModule";

const makeImage = (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
}) => ({
    visible: false,
    setVisible(value: boolean) {
        this.visible = value;
    },
    getBounds: () => bounds,
    setTexture() {},
    setTint() {},
    setBlendMode() {},
    setAlpha() {},
    setPosition() {},
    setScale() {},
});

const makeCtx = () => {
    const images = [
        makeImage({ x: -20, y: -20, width: 40, height: 40 }),
        makeImage({ x: -8, y: -12, width: 16, height: 24 }),
        makeImage({ x: -30, y: -30, width: 60, height: 60 }),
    ];
    return {
        scene: {},
        layers: {},
        textureManager: {},
        pulseEngine: {},
        runtimeVisualEffects: undefined,
        pools: {
            get: () => ({
                imagePool: { acquire: () => images.shift(), release() {} },
            }),
        },
        spec: {
            entityId: "body",
            display_key: "body_avatar",
            hasPhysics: true,
            radius: 16,
        } as any,
        scratch: {
            root: { add() {}, remove() {} },
            nodeOverlayDisplayBounds: {
                entityId: "body",
                centerX: 0,
                topY: -16,
                bottomY: 16,
            },
        },
        entity: {},
        selectedEntityId: null,
        selectEntity() {},
        timeMs: 1,
        deltaMs: 16,
        pulseValue: 0,
    } as any;
};

describe("AvatarModule", () => {
    beforeEach(() => vi.clearAllMocks());

    it("derives bounds from the silhouette image only", () => {
        const ctx = makeCtx();
        createAvatarModule({ resolve: () => ({}) } as any)
            .create(ctx)
            .tick(ctx);
        expect(ctx.scratch.nodeOverlayDisplayBounds).toEqual({
            entityId: "body",
            centerX: 0,
            topY: -12,
            bottomY: 12,
        });
    });

    it("ignores glow image bounds when computing overlay edges", () => {
        const ctx = makeCtx();
        createAvatarModule({ resolve: () => ({}) } as any)
            .create(ctx)
            .tick(ctx);
        expect(ctx.scratch.nodeOverlayDisplayBounds.bottomY).toBe(12);
    });

    it("leaves the default bounds in place when subject seed resolution fails", () => {
        vi.mocked(resolveAvatarSubjectSeed).mockReturnValueOnce(null);
        const ctx = makeCtx();
        createAvatarModule({ resolve: () => ({}) } as any)
            .create(ctx)
            .tick(ctx);
        expect(ctx.scratch.nodeOverlayDisplayBounds).toEqual({
            entityId: "body",
            centerX: 0,
            topY: -16,
            bottomY: 16,
        });
    });
});
