import { describe, expect, it, vi } from "vitest";
import { SelectionModule } from "./SelectionModule";

describe("SelectionModule", () => {
    it("acquires an image halo and starts the pulse tween for the selected entity", () => {
        const halo = {
            width: 20,
            setTexture: vi.fn(),
            setTint: vi.fn(),
            setVisible: vi.fn(),
            setAlpha: vi.fn(),
            setScale: vi.fn(),
        };
        const imageAcquire = vi.fn(() => halo);
        const graphicsAcquire = vi.fn();
        const tweenAdd = vi.fn();
        const getGlyphTexture = vi.fn(() => "glyphtex:ring:#ffffff:3");
        const ctx = {
            scene: { tweens: { add: tweenAdd, killTweensOf: vi.fn() } },
            pools: {
                get: () => ({
                    imagePool: { acquire: imageAcquire, release: vi.fn() },
                    graphicsPool: {
                        acquire: graphicsAcquire,
                        release: vi.fn(),
                    },
                }),
            },
            spec: {
                display_key: "generic_node",
                entityId: "node-1",
                radius: 12,
            },
            scratch: { overlayAnchor: { add: vi.fn(), remove: vi.fn() } },
            textureManager: { getGlyphTexture },
            layers: {},
            pulseEngine: {},
            entity: {},
            selectedEntityId: null,
            selectEntity: () => {},
        } as any;

        const runtime = SelectionModule.create(ctx);
        runtime.tick({
            ...ctx,
            spec: { ...ctx.spec, hasPhysics: true },
            selectedEntityId: "node-1",
        });

        expect(imageAcquire).toHaveBeenCalledTimes(1);
        expect(graphicsAcquire).not.toHaveBeenCalled();
        expect(getGlyphTexture).toHaveBeenCalledWith({
            shape: "ring",
            color: "#ffffff",
            thickness: 3,
        });
        expect(halo.setVisible).toHaveBeenCalledWith(true);
        expect(tweenAdd).toHaveBeenCalledTimes(1);
    });
});
