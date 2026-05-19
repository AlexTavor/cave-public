import { describe, expect, it } from "vitest";
import { MenuAmbientProximityLightModule } from "./MenuAmbientProximityLightModule";

const makeLight = () => {
    const color = {
        last: null as number[] | null,
        setTo(...rgb: number[]) {
            color.last = rgb;
        },
    };
    return {
        blendMode: -1,
        color,
        destroyed: 0,
        intensity: 0,
        radius: 0,
        visible: false,
        x: 0,
        y: 0,
        destroy() {
            this.destroyed += 1;
        },
        setBlendMode(value: number) {
            this.blendMode = value;
        },
        setPosition(x: number, y: number) {
            this.x = x;
            this.y = y;
        },
        setVisible(value: boolean) {
            this.visible = value;
        },
    };
};

const makeCtx = (pointerX = 10, pointerY = 20) => {
    const activeAtCreation: boolean[] = [];
    const calls: number[][] = [];
    const light = makeLight();
    const lights = {
        active: false,
        enableCalls: 0,
        enable() {
            this.active = true;
            this.enableCalls += 1;
        },
        addPointLight(...args: number[]) {
            activeAtCreation.push(this.active);
            calls.push(args);
            return light;
        },
    };
    const ctx = {
        scene: {
            input: { activePointer: { worldX: pointerX, worldY: pointerY } },
            lights,
        },
        spec: { hasPhysics: true, radius: 24, x: 10, y: 20 },
    } as any;
    return {
        activeAtCreation,
        calls,
        ctx,
        light,
        lights,
        runtime: MenuAmbientProximityLightModule.create(ctx),
    };
};

describe("MenuAmbientProximityLightModule", () => {
    it("creates exactly one point light on the first visible tick", () => {
        const subject = makeCtx();
        subject.runtime.tick(subject.ctx);
        expect(subject.calls).toHaveLength(1);
    });

    it("enables the light manager before creating the point light", () => {
        const subject = makeCtx();
        subject.runtime.tick(subject.ctx);
        expect(subject.activeAtCreation).toEqual([true]);
        expect(subject.lights.enableCalls).toBe(1);
        expect(subject.lights.active).toBe(true);
    });

    it("hides an existing light instead of recreating it", () => {
        const subject = makeCtx();
        subject.runtime.tick(subject.ctx);
        subject.ctx.scene.input.activePointer.worldX = 400;
        subject.runtime.tick(subject.ctx);
        expect(subject.calls).toHaveLength(1);
        expect(subject.light.visible).toBe(false);
    });

    it("reuses the same light across visible ticks", () => {
        const subject = makeCtx();
        subject.runtime.tick(subject.ctx);
        subject.ctx.scene.input.activePointer.worldX = 100;
        subject.runtime.tick(subject.ctx);
        expect(subject.calls).toHaveLength(1);
    });

    it("destroys the created light exactly once", () => {
        const subject = makeCtx();
        subject.runtime.tick(subject.ctx);
        subject.runtime.destroy({} as any);
        expect(subject.light.destroyed).toBe(1);
    });
});
