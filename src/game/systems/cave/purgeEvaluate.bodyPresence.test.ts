import { describe, expect, it } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { evaluatePurge } from "./purgeEvaluate";
import {
    makeBuffer,
    makeTestPurgeConfig,
    makeWorldWithPurge,
    snap,
} from "./purgeTestUtils";

describe("evaluatePurge body presence", () => {
    it("kills bodies that have a body component even without the body tag", () => {
        const buffer = makeBuffer();

        evaluatePurge(
            snap([
                makeWorldWithPurge(0, true, 0.1),
                {
                    id: "untagged-body",
                    body: { health: 1, maxHealth: 1 },
                } as any,
            ]),
            buffer,
            2000,
            makeTestPurgeConfig(),
        );

        expect(buffer.commands).toContainEqual(
            expect.objectContaining({
                type: RuntimeCommandType.KILL,
                payload: { entityId: "untagged-body" },
            }),
        );
    });
});
