import { describe, expect, it } from "vitest";
import { evaluateNarrative } from "./purgeNarrative";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import type { RuntimeEntity } from "../../../engine/runtime/types";
import {
    makeBuffer,
    snap,
    makeTestPurgeConfig,
    makeWorldWithProgress,
    withMilestone,
} from "./purgeTestUtils";

describe("evaluateNarrative", () => {
    it("marks the milestone when threshold is reached", () => {
        const config = withMilestone(makeTestPurgeConfig(), "dread", 0.3, [
            "The darkness grows.",
            "A chill runs deep.",
        ]);
        const world = makeWorldWithProgress(30, 100);
        const buffer = makeBuffer();

        evaluateNarrative(snap([world]), buffer, config);

        const stateCmd = buffer.commands.find(
            (c) =>
                c.type === RuntimeCommandType.UPDATE_STATE &&
                c.payload.key === "purge_milestone_dread",
        );
        expect(stateCmd).toBeDefined();
        expect((stateCmd as any).payload.value).toBe(1);
    });

    it("does not fire when milestone already triggered", () => {
        const config = withMilestone(makeTestPurgeConfig(), "dread", 0.3, [
            "The darkness grows.",
        ]);
        const world = makeWorldWithProgress(30, 100, {
            purge_milestone_dread: { value: 1 },
        });
        const buffer = makeBuffer();

        evaluateNarrative(snap([world]), buffer, config);

        expect(buffer.commands).toHaveLength(0);
    });

    it("NOOPs when sys_world is missing", () => {
        const config = withMilestone(makeTestPurgeConfig(), "x", 0.1, ["msg"]);
        const buffer = makeBuffer();

        evaluateNarrative(snap([]), buffer, config);

        expect(buffer.commands).toHaveLength(0);
    });

    it("NOOPs when purge_progress is missing", () => {
        const config = withMilestone(makeTestPurgeConfig(), "x", 0.1, ["msg"]);
        const world: RuntimeEntity = { id: "sys_world", tags: ["sys_world"] };
        const buffer = makeBuffer();

        evaluateNarrative(snap([world]), buffer, config);

        expect(buffer.commands).toHaveLength(0);
    });

    it("NOOPs when effective max is zero", () => {
        const config = withMilestone(makeTestPurgeConfig(), "x", 0.5, ["msg"]);
        const world = makeWorldWithProgress(50, 0, {
            habiti_purge_progress_max_bonus: { value: -100 },
        });
        const buffer = makeBuffer();

        evaluateNarrative(snap([world]), buffer, config);

        expect(buffer.commands).toHaveLength(0);
    });

    it("fires only one milestone per tick", () => {
        let config = makeTestPurgeConfig();
        config = withMilestone(config, "a", 0.2, ["First"]);
        config = withMilestone(config, "b", 0.5, ["Second"]);
        const world = makeWorldWithProgress(60, 100);
        const buffer = makeBuffer();

        evaluateNarrative(snap([world]), buffer, config);
        expect(
            buffer.commands.filter(
                (c) => c.type === RuntimeCommandType.UPDATE_STATE,
            ),
        ).toHaveLength(1);
    });
});

