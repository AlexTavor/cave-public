import { describe, expect, it } from "vitest";
import { evaluateNarrative } from "./purgeNarrative";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import {
    makeBuffer,
    makeWorldWithProgress,
    snap,
    withMilestone,
    makeTestPurgeConfig,
} from "./purgeTestUtils";

describe("evaluateNarrative milestone message", () => {
    it("stores a deterministic milestone message in command metadata", () => {
        const config = withMilestone(makeTestPurgeConfig(), "dread", 0.3, [
            "The darkness grows.",
            "A chill runs deep.",
        ]);
        const world = makeWorldWithProgress(30, 100, {
            worldSeed: { value: "seed-1" },
        });
        const buffer = makeBuffer();

        evaluateNarrative(snap([world]), buffer, config);

        const command = buffer.commands.find(
            (item) => item.type === RuntimeCommandType.UPDATE_STATE,
        );
        expect(command?.metadata?.purgeMilestoneMessage).toBeTruthy();
        expect(config.purge.milestones[0].messages).toContain(
            command?.metadata?.purgeMilestoneMessage,
        );
    });
});
