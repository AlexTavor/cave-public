import { beforeEach, describe, expect, it } from "vitest";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import { evaluateRunStartCycleBannerCommands } from "./evaluateRunStartCycleBannerCommands";
import { runStartCycleBannerStore } from "./runStartCycleBannerStore";

const snapshot = (world: Record<string, unknown>) =>
    new Snapshot(
        [{ id: "sys_world", ...world }] as any,
        { getBody: () => undefined } as any,
    );

describe("evaluateRunStartCycleBannerCommands", () => {
    beforeEach(() => runStartCycleBannerStore.getState().reset());

    it("shows a banner from the current snapshot after a run-number adjust", () => {
        evaluateRunStartCycleBannerCommands(
            [
                {
                    type: "ADJUST_FACT",
                    payload: {
                        scope: "run",
                        factType: "run_number",
                        factAbout: "world",
                        delta: 3,
                    },
                } as any,
            ],
            snapshot({ run: { run_number: { world: 3 } } }),
        );

        expect(runStartCycleBannerStore.getState().banner).toEqual({
            runNumber: 3,
            revision: 1,
        });
    });

    it("ignores permanent-only, unrelated, and malformed batches", () => {
        evaluateRunStartCycleBannerCommands(
            [
                {
                    type: "ADJUST_FACT",
                    payload: {
                        scope: "permanent",
                        factType: "run_number",
                        factAbout: "world",
                        delta: 1,
                    },
                } as any,
            ],
            snapshot({ run: { run_number: { world: 1 } } }),
        );
        evaluateRunStartCycleBannerCommands(
            [
                {
                    type: "ADJUST_FACT",
                    payload: {
                        scope: "run",
                        factType: "thought_seen",
                        factAbout: "intro",
                        delta: 1,
                    },
                } as any,
            ],
            snapshot({ run: { run_number: { world: 1 } } }),
        );
        evaluateRunStartCycleBannerCommands(
            [
                {
                    type: "ADJUST_FACT",
                    payload: {
                        scope: "run",
                        factType: "run_number",
                        factAbout: "world",
                        delta: 1,
                    },
                } as any,
            ],
            snapshot({ run: { run_number: { world: "bad" } } }),
        );

        expect(runStartCycleBannerStore.getState().banner).toBeNull();
    });
});
