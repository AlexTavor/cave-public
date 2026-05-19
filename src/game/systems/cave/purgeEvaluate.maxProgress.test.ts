import { describe, expect, it } from "vitest";
import {
    RuntimeCommandType,
    type RuntimeEntity,
} from "../../../engine/runtime/types";
import { evaluatePurge } from "./purgeEvaluate";
import { makeBuffer, makeTestPurgeConfig, snap } from "./purgeTestUtils";

const makeWorld = (value: number, max: number, bonus = 0): RuntimeEntity => ({
    id: "sys_world",
    tags: ["sys_world"],
    state: {
        purge_progress: { value, max },
        habiti_purge_progress_max_bonus: { value: bonus },
    },
    cave: { purge: { isActive: false, nextKillTimer: 0 } },
});

describe("evaluatePurge effective max progress", () => {
    it("syncs purge_progress.max to the effective max", () => {
        const buffer = makeBuffer();
        evaluatePurge(
            snap([makeWorld(100, 100, 50)]),
            buffer,
            16,
            makeTestPurgeConfig(),
        );
        expect(buffer.commands).toContainEqual({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: { entityId: "sys_world", key: "purge_progress", max: 150 },
        });
    });

    it("does not activate while progress is below the effective max", () => {
        const buffer = makeBuffer();
        evaluatePurge(
            snap([makeWorld(100, 100, 50)]),
            buffer,
            16,
            makeTestPurgeConfig(),
        );
        expect(
            buffer.commands.some(
                (command) =>
                    command.type === RuntimeCommandType.ADJUST_FACT &&
                    command.payload.factType === "purge_began",
            ),
        ).toBe(false);
    });

    it("activates when progress reaches the effective max", () => {
        const buffer = makeBuffer();
        evaluatePurge(
            snap([makeWorld(150, 100, 50)]),
            buffer,
            16,
            makeTestPurgeConfig(),
        );
        expect(buffer.commands).toContainEqual({
            type: RuntimeCommandType.ADJUST_FACT,
            payload: {
                scope: "run",
                factType: "purge_began",
                factAbout: "world",
                delta: 1,
            },
        });
    });

    it("uses a smaller effective max without issuing manual value clamping", () => {
        const buffer = makeBuffer();
        evaluatePurge(
            snap([makeWorld(120, 150, -50)]),
            buffer,
            16,
            makeTestPurgeConfig(),
        );
        expect(buffer.commands).toContainEqual({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: { entityId: "sys_world", key: "purge_progress", max: 50 },
        });
        expect(
            buffer.commands.some(
                (command) =>
                    command.type === RuntimeCommandType.UPDATE_STATE &&
                    command.payload.key === "purge_progress" &&
                    "value" in command.payload,
            ),
        ).toBe(false);
    });
});
