import { describe, expect, it } from "vitest";
import { BLEND_MODE_ADD } from "../../blendModes";
import { resolveLightState } from "./lightModuleState";

const makeTickCtx = (entity: Record<string, unknown>) =>
    ({
        entity,
        spec: { entityId: "entity-1", display_key: "transfer", radius: 30 },
        pulseValue: 0,
        timeMs: 0,
        deltaMs: 16,
        scene: {},
        layers: {},
        pools: {},
        textureManager: {},
        pulseEngine: {},
        scratch: {},
        selectedEntityId: null,
        selectEntity: () => {},
    }) as any;

describe("LightModule cycle lights", () => {
    it("lights cycle producers in their output resource color", () => {
        const state = resolveLightState(
            makeTickCtx({
                state: {
                    cycle: { value: 50, max: 100 },
                    cycle_active: { value: 1 },
                    wood: { value: 0, visible: false },
                },
            }),
        );
        expect(state).toMatchObject({ kind: "point", color: "#8B4513" });
        expect(state?.blendMode).toBe(BLEND_MODE_ADD);
        expect(state?.alpha).toBeCloseTo(1);
        expect(state?.radius).toBeCloseTo(27);
    });

    it("prefers conversion output resources over stored inputs", () => {
        const state = resolveLightState(
            makeTickCtx({
                state: {
                    cycle: { value: 0, max: 10 },
                    cycle_active: { value: 1 },
                    wood: {
                        value: 1,
                        max: 10,
                        visible: true,
                        allowDeposit: true,
                        allowWithdraw: false,
                    },
                    heat: {
                        value: 0,
                        max: 120,
                        visible: true,
                        allowDeposit: false,
                        allowWithdraw: true,
                    },
                },
            }),
        );
        expect(state).toMatchObject({ kind: "point", color: "#FF9800" });
        expect(state?.radius).toBeCloseTo(9);
    });

    it("falls back to vein purple for cycle entities without resource outputs", () => {
        const state = resolveLightState(
            makeTickCtx({
                state: {
                    cycle: { value: 25, max: 100 },
                    cycle_active: { value: 1 },
                    custom_progress: { value: 7, visible: false },
                },
            }),
        );
        expect(state).toMatchObject({ kind: "point", color: "#8888ff" });
        expect(state?.blendMode).toBe(BLEND_MODE_ADD);
        expect(state?.alpha).toBeCloseTo(1);
        expect(state?.radius).toBeCloseTo(18);
    });

    it("scales authored style lights by cycle progress", () => {
        const tickCtx = makeTickCtx({
            state: {
                cycle: { value: 50, max: 100 },
                cycle_active: { value: 1 },
            },
        });
        tickCtx.spec.style = {
            light: {
                color: "#ffffff",
                alpha: 0.25,
                radiusFactor: 1.2,
                blendMode: "ADD",
            },
        };
        const state = resolveLightState(tickCtx);
        expect(state?.alpha).toBeCloseTo(0.25);
        expect(state?.radius).toBeCloseTo(32.4);
    });
});
