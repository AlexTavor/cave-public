import { describe, it, expect, vi } from "vitest";

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
import {
    makeFakeTarget,
    makeInteractionCtx,
} from "./InteractionModule.testUtils";

describe("InteractionModule", () => {
    it("uses root as target even when scratch.backgroundImage is present", () => {
        const bgImg = makeFakeTarget(true);
        const root = makeFakeTarget();
        const ctx = makeInteractionCtx(bgImg as never, root as never);
        InteractionModule.create(ctx);
        root.emit("pointerdown");

        expect(root.input).not.toBeNull();
        expect(bgImg.input).toBeNull();
        expect(ctx.selectEntity).toHaveBeenCalledTimes(1);
        expect(ctx.selectEntity).toHaveBeenCalledWith("e1");
    });

    it("uses root circle when scratch.backgroundImage is null", () => {
        // Given
        const root = makeFakeTarget(false);
        const ctx = makeInteractionCtx(null, root as never);
        // When
        InteractionModule.create(ctx);
        // Then: root is made interactive
        expect(root.input).not.toBeNull();
    });

    it("root-circle target: enabled when hasPhysics && radius > 0.5", () => {
        // Given
        const root = makeFakeTarget();
        const ctx = makeInteractionCtx(null, root as never, true, 10);
        const runtime = InteractionModule.create(ctx);
        if (!root.input) throw new Error("Expected root to be interactive");
        root.input.enabled = false;
        // When
        runtime.tick({
            ...ctx,
            timeMs: 0,
            deltaMs: 16,
            pulseValue: 0.5,
        } as never);
        // Then
        expect(root.input.enabled).toBe(true);
    });

    it("root-circle target: disabled when radius not visible (radius=0.5)", () => {
        // Given
        const root = makeFakeTarget();
        const ctx = makeInteractionCtx(null, root as never, true, 10);
        const runtime = InteractionModule.create(ctx);
        if (!root.input) throw new Error("Expected root to be interactive");
        root.input.enabled = true;
        // When
        const tickCtx = {
            ...ctx,
            timeMs: 0,
            deltaMs: 16,
            pulseValue: 0.5,
            spec: { ...ctx.spec, radius: 0.5 },
        };
        runtime.tick(tickCtx as never);
        // Then
        expect(root.input.enabled).toBe(false);
    });

    it("ignores backgroundImage visibility when root owns interaction", () => {
        const bgImg = makeFakeTarget(false);
        const root = makeFakeTarget();
        const ctx = makeInteractionCtx(bgImg as never, root as never);
        const runtime = InteractionModule.create(ctx);
        if (!root.input) throw new Error("Expected root to be interactive");
        root.input.enabled = false;
        runtime.tick({
            ...ctx,
            timeMs: 0,
            deltaMs: 16,
            pulseValue: 0.5,
        } as never);

        expect(root.input.enabled).toBe(true);
        expect(bgImg.input).toBeNull();
    });

    it("pointerdown triggers selectEntity exactly once per event", () => {
        // Given
        const root = makeFakeTarget();
        const ctx = makeInteractionCtx(null, root as never);
        InteractionModule.create(ctx);
        // When
        root.emit("pointerdown");
        // Then
        expect(ctx.selectEntity).toHaveBeenCalledTimes(1);
        expect(ctx.selectEntity).toHaveBeenCalledWith("e1");
    });
});
