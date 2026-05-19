import { describe, expect, it, vi } from "vitest";
import { InteractionModule } from "./InteractionModule";

vi.mock("phaser", () => ({
    default: {
        Geom: {
            Circle: class {
                static Contains() {
                    return false;
                }
            },
        },
    },
}));

const createTarget = () => ({
    visible: true,
    input: { enabled: true },
    scene: undefined,
    listeners: {} as Record<string, Array<() => void>>,
    setInteractive() {},
    disableInteractive: vi.fn(() => {
        throw new Error("should not be called after scene shutdown");
    }),
    on(event: string, handler: () => void) {
        this.listeners[event] = [handler];
    },
    removeAllListeners(event: string) {
        this.listeners[event] = [];
    },
    setData() {},
});

describe("InteractionModule destroy", () => {
    it("does not call Phaser disableInteractive after scene shutdown", () => {
        const root = createTarget();
        const runtime = InteractionModule.create({
            spec: {
                entityId: "e1",
                display_key: "x",
                label: "",
                styleId: null,
                hasPhysics: true,
                x: 0,
                y: 0,
                radius: 10,
            },
            scratch: { root, backgroundImage: null },
            selectEntity: vi.fn(),
        } as any);

        expect(() => runtime.destroy({} as any)).not.toThrow();
        expect(root.input.enabled).toBe(false);
    });
});
