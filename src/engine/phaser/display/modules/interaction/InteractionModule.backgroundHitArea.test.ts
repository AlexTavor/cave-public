import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
    default: {
        Geom: {
            Circle: class Circle {
                constructor(
                    public x: number,
                    public y: number,
                    public radius: number,
                ) {}
                static Contains() {
                    return false;
                }
            },
        },
    },
}));

import { InteractionModule } from "./InteractionModule";

const createTarget = () => ({
    visible: true,
    displayOriginX: 18,
    displayOriginY: 20,
    input: null as { enabled: boolean } | null,
    hitArea: null as { x: number; y: number; radius: number } | null,
    setInteractive(hitArea?: { x: number; y: number; radius: number }) {
        this.hitArea = hitArea ?? null;
        this.input = { enabled: true };
    },
    disableInteractive() {},
    on() {},
    removeAllListeners() {},
    setData() {},
});

describe("InteractionModule background hit area", () => {
    it("keeps the root hit area centered when a background image exists", () => {
        const backgroundImage = createTarget();
        const root = createTarget();
        const runtime = InteractionModule.create({
            spec: {
                entityId: "merchant_of_hommlet",
                display_key: "merchant_of_hommlet",
                label: "Merchant",
                styleId: null,
                hasPhysics: true,
                x: 0,
                y: 0,
                radius: 24,
            },
            scratch: { root, backgroundImage },
            selectEntity: vi.fn(),
        } as never);

        expect(root.hitArea?.x).toBe(18);
        expect(root.hitArea?.y).toBe(20);
        expect(root.hitArea?.radius).toBe(24);
        expect(backgroundImage.hitArea).toBeNull();

        runtime.tick({
            spec: { hasPhysics: true, radius: 36 },
            scratch: { root, backgroundImage },
        } as never);

        expect(root.hitArea?.x).toBe(18);
        expect(root.hitArea?.y).toBe(20);
        expect(root.hitArea?.radius).toBe(36);
        expect(root.input?.enabled).toBe(true);
    });
});
