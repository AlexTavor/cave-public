import { describe, expect, it, vi } from "vitest";
import { DisplayTypePool } from "./DisplayTypePool";

const makeScene = () => ({
    children: {
        list: [] as any[],
        add: vi.fn((obj: any) => void scene.children.list.push(obj)),
        remove: vi.fn((obj: any) => {
            scene.children.list = scene.children.list.filter(
                (it) => it !== obj,
            );
        }),
    },
});

let scene = makeScene();

const makeObject = () => ({
    scene,
    parentContainer: { remove: vi.fn() },
    clear: vi.fn(),
    clearMask: vi.fn(),
    removeAll: vi.fn(),
    setAlpha: vi.fn(),
    setBlendMode: vi.fn(),
    setFlipX: vi.fn(),
    setPosition: vi.fn(),
    setRotation: vi.fn(),
    setScale: vi.fn(),
    setVisible: vi.fn(),
    clearTint: vi.fn(),
});

describe("DisplayTypePool scene cleanup", () => {
    it("detaches released image, graphics, and root objects from the scene list", () => {
        scene = makeScene();
        const pool = new DisplayTypePool("veins_display");
        const root = makeObject();
        const image = makeObject();
        const graphics = makeObject();
        scene.children.list.push(root, image, graphics);

        pool.rootPool.release(root as any);
        pool.imagePool.release(image as any);
        pool.graphicsPool.release(graphics as any);

        expect(scene.children.list).toEqual([]);
        expect(pool.getStats()).toMatchObject({
            rootPool: { availableOnScene: 0 },
            imagePool: { availableOnScene: 0 },
            graphicsPool: { availableOnScene: 0 },
        });
    });
});
