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
    input: null as {
        enabled: boolean;
        hitArea: { x: number; y: number; radius: number };
    } | null,
    setInteractive(hitArea?: { x: number; y: number; radius: number }) {
        this.input = {
            enabled: true,
            hitArea: {
                x: hitArea?.x ?? 0,
                y: hitArea?.y ?? 0,
                radius: hitArea?.radius ?? 0,
            },
        };
    },
    disableInteractive() {},
    on() {},
    removeAllListeners() {},
    setData() {},
});

describe("InteractionModule root hit area", () => {
    it("keeps the root hit area centered and in sync after spawn", () => {
        const root = createTarget();
        const runtime = InteractionModule.create({
            spec: {
                entityId: "merchant_of_hommlet",
                display_key: "generic_node",
                label: "Merchant",
                styleId: null,
                hasPhysics: true,
                x: 0,
                y: 0,
                radius: 24,
            },
            scratch: { root, backgroundImage: null },
            selectEntity: vi.fn(),
        } as never);

        runtime.tick({
            spec: { hasPhysics: true, radius: 36 },
            scratch: { root },
        } as never);

        expect(root.input?.hitArea.x).toBe(0);
        expect(root.input?.hitArea.y).toBe(0);
        expect(root.input?.hitArea.radius).toBe(36);
        expect(root.input?.enabled).toBe(true);
    });
});
