// @vitest-environment jsdom
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

const makeTarget = () => ({
    visible: true,
    input: null as { enabled: boolean } | null,
    setInteractive() {
        this.input = { enabled: true };
    },
    disableInteractive() {},
    on() {},
    removeAllListeners() {},
    setData() {},
});

describe("InteractionModule attention blocking", () => {
    it("keeps blocked root targets non-interactive", () => {
        const root = makeTarget();
        const runtime = InteractionModule.create({
            spec: {
                entityId: "e1",
                display_key: "attr_body",
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

        (root as any).__tutorialInteractionBlocked = true;
        runtime.tick({
            spec: { hasPhysics: true, radius: 10 },
            timeMs: 0,
            deltaMs: 16,
            pulseValue: 0.5,
            scratch: { root },
        } as any);

        expect(root.input?.enabled).toBe(false);
    });
});
