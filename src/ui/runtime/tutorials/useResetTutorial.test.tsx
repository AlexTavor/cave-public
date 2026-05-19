// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { useRuntimeStore } from "../state/useRuntimeStore";
import {
    extractTutorialCompletionMemory,
    persistTutorialCompletionMemory,
} from "./tutorialCompletionMemory";
import {
    persistTutorialMode,
    readStoredTutorialMode,
} from "./tutorialModeMemory";
import { useResetTutorial } from "./useResetTutorial";

afterEach(() => {
    globalThis.localStorage?.clear();
    useRuntimeStore.setState({ runtime: null, status: "idle" } as any);
});

describe("useResetTutorial", () => {
    it("clears completion memory and restores tutorial mode", () => {
        const enqueue = vi.fn();
        useRuntimeStore.setState({
            runtime: {
                commands: { enqueue },
                flushCommands: vi.fn(),
                getEntity: () => ({
                    permanent: { tutorial_completed: { intro: 1 } },
                    state: { tutorial_mode: { value: 0 } },
                    tutorial: { active: true },
                }),
                getState: () => ({ status: "paused" }),
            } as any,
        } as any);
        persistTutorialCompletionMemory({ intro: 1 });
        persistTutorialMode(0);

        const { result } = renderHook(() => useResetTutorial());
        act(() => result.current.resetTutorial());

        expect(extractTutorialCompletionMemory(null)).toEqual({});
        expect(readStoredTutorialMode()).toBe(1);
        expect(enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.SET_TUTORIAL_STATE,
            payload: { tutorial: null },
        });
    });

    it("stays enabled when storage only contains tutorial mode off", () => {
        persistTutorialMode(0);
        const { result } = renderHook(() => useResetTutorial());
        expect(result.current.canResetTutorial).toBe(true);
    });
});
