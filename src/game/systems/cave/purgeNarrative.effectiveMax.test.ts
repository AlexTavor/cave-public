import { describe, expect, it } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { evaluateNarrative } from "./purgeNarrative";
import {
    makeBuffer,
    makeTestPurgeConfig,
    snap,
    withMilestone,
} from "./purgeTestUtils";

const makeWorld = (progress: number) => ({
    id: "sys_world",
    tags: ["sys_world"],
    state: {
        purge_progress: { value: progress, max: 100 },
        habiti_purge_progress_max_bonus: { value: 50 },
    },
});

describe("evaluateNarrative effective max progress", () => {
    it("does not fire a milestone when the effective ratio stays below threshold", () => {
        const config = withMilestone(makeTestPurgeConfig(), "dread", 0.3, [
            "msg",
        ]);
        const buffer = makeBuffer();
        evaluateNarrative(snap([makeWorld(30) as any]), buffer, config);
        expect(buffer.commands).toHaveLength(0);
    });

    it("fires a milestone when the effective ratio reaches threshold", () => {
        const config = withMilestone(makeTestPurgeConfig(), "dread", 0.3, [
            "msg",
        ]);
        const buffer = makeBuffer();
        evaluateNarrative(snap([makeWorld(45) as any]), buffer, config);
        expect(buffer.commands).toContainEqual(
            expect.objectContaining({
                type: RuntimeCommandType.UPDATE_STATE,
                payload: expect.objectContaining({
                    key: "purge_milestone_dread",
                    value: 1,
                }),
            }),
        );
    });
});
