// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../../../engine/runtime/types";
import { readStoredTutorialMode } from "../../tutorials/tutorialModeMemory";
import { tutorialModeCommand } from "./tutorialModeCommand";

describe("tutorialModeCommand", () => {
    beforeEach(() => {
        globalThis.localStorage?.clear();
    });

    it("updates storage and runtime for valid inputs", async () => {
        const enqueue = vi.fn();
        const flushCommands = vi.fn();
        const runtime = { commands: { enqueue }, flushCommands };

        const result = await tutorialModeCommand.execute(["false"], {
            runtime: { getRuntime: () => runtime },
        } as any);

        expect(result.type).toBe("success");
        expect(readStoredTutorialMode()).toBe(0);
        expect(enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "sys_world",
                key: "tutorial_mode",
                value: 0,
                visible: false,
            },
        });
        expect(flushCommands).toHaveBeenCalledTimes(1);
    });

    it("rejects invalid args and missing runtimes", async () => {
        expect(
            (await tutorialModeCommand.execute(["maybe"], {} as any)).type,
        ).toBe("error");
        expect(
            (await tutorialModeCommand.execute(["true"], {} as any)).type,
        ).toBe("error");
    });
});
