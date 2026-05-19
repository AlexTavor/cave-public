// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import {
    extractTutorialMode,
    persistTutorialMode,
    readStoredTutorialMode,
    resetTutorialMode,
    restoreTutorialMode,
} from "./tutorialModeMemory";

describe("tutorialModeMemory", () => {
    beforeEach(() => {
        globalThis.localStorage?.clear();
    });

    it("defaults to enabled when storage is missing or invalid", () => {
        expect(readStoredTutorialMode()).toBe(1);
        globalThis.localStorage?.setItem("cave.tutorial-mode", "oops");
        expect(readStoredTutorialMode()).toBe(1);
    });

    it("normalizes persisted values to 0 or 1", () => {
        persistTutorialMode(99);
        expect(readStoredTutorialMode()).toBe(1);
        persistTutorialMode(-1);
        expect(readStoredTutorialMode()).toBe(0);
    });

    it("restores tutorial mode into the live runtime and flushes", () => {
        const enqueue = vi.fn();
        const flushCommands = vi.fn();

        restoreTutorialMode({ commands: { enqueue }, flushCommands } as any, 0);

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
        expect(readStoredTutorialMode()).toBe(0);
    });

    it("extracts the live value and resets back to enabled", () => {
        const runtime = {
            commands: { enqueue: vi.fn() },
            flushCommands: vi.fn(),
            getEntity: () => ({ state: { tutorial_mode: { value: 0 } } }),
        } as any;

        expect(extractTutorialMode(runtime)).toBe(0);
        resetTutorialMode(runtime);
        expect(readStoredTutorialMode()).toBe(1);
    });

    it("falls back to stored mode when live world state omits tutorial mode", () => {
        persistTutorialMode(0);
        expect(
            extractTutorialMode({ getEntity: () => ({ state: {} }) } as any),
        ).toBe(0);
        expect(extractTutorialMode({ getEntity: () => null } as any)).toBe(0);
    });
});
