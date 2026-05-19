import { describe, expect, it } from "vitest";
import { Snapshot } from "../../runtime/Snapshot";
import { ImpulseEngine } from "../../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../data/schemas/physics";
import {
    DEFAULT_VEIN_CONFIG,
    type VeinConfig,
} from "../../../data/schemas/assets";
import { JsonLogicAdapter } from "../../logic/JsonLogicAdapter";
import { resolveHeartbeatPreset } from "./heartbeatRules";
import type { RuntimeEntity } from "../../runtime/types";

const makeSnapshot = (comfort: number, heat: number): Snapshot => {
    const world: RuntimeEntity = {
        id: "sys_world",
        state: {
            comfort: { value: comfort },
            heat: { value: heat },
        },
    };
    return new Snapshot([world], new ImpulseEngine(DEFAULT_IMPULSE_CONFIG));
};

const makeConfig = (): VeinConfig => ({
    ...DEFAULT_VEIN_CONFIG,
    heartbeats: {
        ...DEFAULT_VEIN_CONFIG.heartbeats,
        default: "healthy",
        presets: {
            healthy: {
                bpm: 60,
                envelope: [
                    { t: 0, v: 0 },
                    { t: 1, v: 0 },
                ],
            },
            panic: {
                bpm: 120,
                envelope: [
                    { t: 0, v: 0 },
                    { t: 1, v: 1 },
                ],
            },
            frozen: {
                bpm: 30,
                envelope: [
                    { t: 0, v: 0 },
                    { t: 1, v: 0 },
                ],
            },
        },
        rules: [
            {
                condition: {
                    id: "comfort_low",
                    sortKey: "a",
                    tokens: [
                        { t: "ref", v: "global.comfort" },
                        { t: "op", v: "<" },
                        { t: "val", v: 0.5 },
                    ],
                },
                preset: "panic",
            },
            {
                condition: {
                    id: "heat_low",
                    sortKey: "b",
                    tokens: [
                        { t: "ref", v: "global.heat" },
                        { t: "op", v: "<" },
                        { t: "val", v: 100 },
                    ],
                },
                preset: "frozen",
            },
        ],
    },
});

describe("Nervous system heartbeat rules", () => {
    it("selects the last matching rule", () => {
        const adapter = new JsonLogicAdapter();
        const config = makeConfig();

        const panic = resolveHeartbeatPreset(
            config,
            makeSnapshot(0.4, 500),
            adapter,
        );
        expect(panic).toBe("panic");

        const frozen = resolveHeartbeatPreset(
            config,
            makeSnapshot(0.4, 50),
            adapter,
        );
        expect(frozen).toBe("frozen");

        const healthy = resolveHeartbeatPreset(
            config,
            makeSnapshot(1, 500),
            adapter,
        );
        expect(healthy).toBe("healthy");
    });
});

