import { beforeEach, describe, expect, it } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { CinematicEventBridge } from "./CinematicEventBridge";
import { evaluateCinematicCommands } from "./evaluateCinematicCommands";

describe("evaluateCinematicCommands", () => {
    beforeEach(() => {
        CinematicEventBridge.drain();
    });

    it("forwards only SHOW_CINEMATIC commands to the bridge", () => {
        evaluateCinematicCommands([
            { type: RuntimeCommandType.KILL, payload: { entityId: "e1" } },
            {
                type: RuntimeCommandType.SHOW_CINEMATIC,
                payload: { lines: ["A"] },
            },
            {
                type: RuntimeCommandType.SHOW_CINEMATIC,
                payload: { lines: ["B", "C"] },
            },
        ] as any);

        expect(CinematicEventBridge.drain()).toEqual([
            { lines: ["A"] },
            { lines: ["B", "C"] },
        ]);
    });
});
