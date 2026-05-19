// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRuntimeCinematicBridge } from "./useRuntimeCinematicBridge";
import { useAppShellStore } from "./useAppShellStore";
import { CinematicEventBridge } from "../ui/runtime/cinematic/CinematicEventBridge";

const pauseMock = vi.hoisted(() => vi.fn());
vi.mock("../ui/runtime/state/useRuntimeStore", () => ({
    useRuntimeStore: Object.assign(
        vi.fn(() => ({})),
        {
            getState: () => ({ pause: pauseMock }),
        },
    ),
}));

describe("useRuntimeCinematicBridge", () => {
    const frames: FrameRequestCallback[] = [];

    beforeEach(() => {
        frames.length = 0;
        pauseMock.mockReset();
        CinematicEventBridge.drain();
        useAppShellStore.setState({
            overlay: "none",
            cinematicLines: null,
            cinematicSource: null,
        });
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
            (cb) => {
                frames.push(cb);
                return frames.length;
            },
        );
        vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(
            () => {},
        );
    });

    it("pauses runtime and shows the last cinematic in a drained batch", () => {
        renderHook(() => useRuntimeCinematicBridge());
        [["A"], ["B"]].forEach((lines) => CinematicEventBridge.push({ lines }));

        act(() => frames.shift()?.(0));

        expect(pauseMock).toHaveBeenCalled();
        expect(useAppShellStore.getState().cinematicLines).toEqual(["B"]);
        expect(useAppShellStore.getState().cinematicSource).toBe("runtime");
    });

    it("does nothing when the bridge is empty", () => {
        renderHook(() => useRuntimeCinematicBridge());

        act(() => frames.shift()?.(0));

        expect(pauseMock).not.toHaveBeenCalled();
        expect(useAppShellStore.getState().overlay).toBe("none");
    });
});
