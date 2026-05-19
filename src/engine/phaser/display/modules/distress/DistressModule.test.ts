import { describe, expect, it, vi } from "vitest";
import { DistressModule } from "./DistressModule";

const makeAnchor = () => ({
    x: 0,
    y: 0,
    visible: false,
    add: vi.fn(),
    remove: vi.fn(),
    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    },
    setVisible(value: boolean) {
        this.visible = value;
    },
});

describe("DistressModule", () => {
    it("starts a staggered three-ring image burst at the body runtime position", () => {
        const images = Array.from({ length: 3 }, () => ({
            width: 20,
            setTexture: vi.fn(),
            setTint: vi.fn(),
            setPosition: vi.fn(),
            setAlpha: vi.fn(),
            setScale: vi.fn(),
            setVisible: vi.fn(),
        }));
        const tweenAdd = vi.fn();
        const imageAcquire = vi.fn(() => images.shift());
        const getGlyphTexture = vi.fn(() => "glyphtex:ring:#ffffff:3");
        const root = {
            visible: false,
            setVisible(value: boolean) {
                this.visible = value;
            },
        };
        const overlayAnchor = makeAnchor();
        const runtime = {
            getPhysicsBody: (id: string) =>
                id === "body-1"
                    ? { position: { x: 50, y: 60 }, radius: 25 }
                    : undefined,
        };
        const ctx = {
            scene: {
                tweens: { add: tweenAdd, killTweensOf: vi.fn() },
                readRuntime: () => runtime,
            },
            pools: {
                get: () => ({
                    imagePool: {
                        acquire: imageAcquire,
                        release: vi.fn(),
                    },
                }),
            },
            scratch: { root, overlayAnchor },
            spec: { display_key: "body_avatar", radius: 12, hasPhysics: false },
            entity: { id: "body-1", body: { health: 1, maxHealth: 10 } },
            layers: {},
            textureManager: { getGlyphTexture },
            pulseEngine: {},
            selectedEntityId: null,
            selectEntity: () => {},
        } as any;

        DistressModule.create(ctx).tick({
            ...ctx,
            timeMs: 1000,
            deltaMs: 16,
            pulseValue: 0.5,
        });

        expect(root.visible).toBe(true);
        expect(overlayAnchor.visible).toBe(true);
        expect(overlayAnchor.x).toBe(50);
        expect(overlayAnchor.y).toBe(60);
        expect(overlayAnchor.add).toHaveBeenCalledTimes(3);
        expect(imageAcquire).toHaveBeenCalledTimes(3);
        expect(getGlyphTexture).toHaveBeenCalledWith({
            shape: "ring",
            color: "#ffffff",
            thickness: 3,
        });
        expect(tweenAdd).toHaveBeenCalledTimes(3);
        expect(tweenAdd.mock.calls.map((call) => call[0].delay)).toEqual([
            0, 170, 340,
        ]);
    });
});
